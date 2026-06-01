import { createHash, randomBytes } from "node:crypto";

import bcrypt from "bcryptjs";

import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";

/**
 * Fluxo de redefinição de senha (SPEC §14.1).
 *
 * Segurança:
 * - O token enviado por e-mail é aleatório (32 bytes). No banco guardamos apenas
 *   o SHA-256 do token — nunca o valor em claro (como em sessões/CSRF).
 * - Expiração curta (1h) e uso único (usedAt).
 * - Respostas genéricas no caller: não revelar se o e-mail existe.
 */

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

const APP_URL =
  process.env.AUTH_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

/**
 * Gera um token de reset para o e-mail (se houver usuário ativo) e envia o link.
 * Sempre resolve sem erro — o caller não deve revelar a existência do e-mail.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, isActive: true },
  });
  if (!user || !user.isActive) return;

  // Invalida tokens anteriores ainda válidos deste usuário.
  await db.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  const token = randomBytes(32).toString("hex");
  await db.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    },
  });

  const link = `${APP_URL}/reset-password?token=${token}`;
  // Best-effort: uma falha no provider de e-mail não deve quebrar o fluxo nem
  // revelar (via erro) se o e-mail existe. O token já está persistido.
  try {
    await sendEmail({
      to: email,
      subject: "Redefinição de senha — ClassOS",
      text:
        `Recebemos um pedido para redefinir sua senha.\n\n` +
        `Acesse o link abaixo (válido por 1 hora):\n${link}\n\n` +
        `Se você não solicitou, ignore este e-mail.`,
    });
  } catch {
    // já logado no provider; segue sem propagar.
  }
}

export type ResetResult = { ok: true } | { ok: false; error: string };

/**
 * Redefine a senha a partir de um token válido (não expirado, não usado).
 * Marca o token como usado e grava o novo hash bcrypt.
 */
export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<ResetResult> {
  const record = await db.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { ok: false, error: "Link inválido ou expirado. Solicite um novo." };
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await db.$transaction([
    db.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    db.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
  ]);

  return { ok: true };
}
