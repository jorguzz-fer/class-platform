import { createHash, randomBytes } from "node:crypto";

import bcrypt from "bcryptjs";

import { db } from "@/lib/db";
import { isEmailConfigured, sendEmail } from "@/lib/email";

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

  const link = await issueResetLink(user.id);
  // Best-effort: uma falha no provider de e-mail não deve quebrar o fluxo nem
  // revelar (via erro) se o e-mail existe. O token já está persistido.
  try {
    await sendResetEmail(email, link);
  } catch {
    // já logado no provider; segue sem propagar.
  }
}

/** Invalida links pendentes do usuário e gera um novo (1h, uso único). */
async function issueResetLink(userId: string): Promise<string> {
  await db.passwordResetToken.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: new Date() },
  });

  const token = randomBytes(32).toString("hex");
  await db.passwordResetToken.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    },
  });
  return `${APP_URL}/reset-password?token=${token}`;
}

function sendResetEmail(email: string, link: string): Promise<void> {
  return sendEmail({
    to: email,
    subject: "Redefinição de senha — ClassOS",
    text:
      `Recebemos um pedido para redefinir sua senha.\n\n` +
      `Acesse o link abaixo (válido por 1 hora):\n${link}\n\n` +
      `Se você não solicitou, ignore este e-mail.`,
  });
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

// ---- Redefinição pela escola (dono/admin) ---------------------------------

export type StaffPasswordResult = { ok: true } | { ok: false; error: string };

/**
 * A escola só pode DEFINIR a senha de uma conta que é exclusivamente aluno
 * dela. A conta é global: o mesmo e-mail pode ser aluno em outra escola ou até
 * dono de uma. Sem esta regra, uma escola poderia cadastrar o e-mail de outra
 * pessoa como "aluno" e trocar a senha dela (tomada de conta). Para os demais
 * casos, só o link por e-mail (que exige acesso à caixa da pessoa).
 */
export async function canStaffSetStudentPassword(
  organizationId: string,
  studentId: string,
): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: studentId },
    select: {
      role: true,
      memberships: { select: { organizationId: true, role: true } },
    },
  });
  if (!user || user.role !== "STUDENT") return false;
  return (
    user.memberships.length > 0 &&
    user.memberships.every(
      (m) => m.organizationId === organizationId && m.role === "STUDENT",
    )
  );
}

/** Define uma senha provisória para o aluno (só contas exclusivas da escola). */
export async function staffSetStudentPassword(
  organizationId: string,
  studentId: string,
  newPassword: string,
): Promise<StaffPasswordResult> {
  if (!(await canStaffSetStudentPassword(organizationId, studentId))) {
    return {
      ok: false,
      error:
        "Este aluno também tem acesso em outra escola. Por segurança, use o link de redefinição por e-mail.",
    };
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await db.$transaction([
    db.user.update({ where: { id: studentId }, data: { passwordHash } }),
    // Links de redefinição pendentes deixam de valer.
    db.passwordResetToken.updateMany({
      where: { userId: studentId, usedAt: null },
      data: { usedAt: new Date() },
    }),
  ]);
  return { ok: true };
}

/** Envia ao aluno o link de redefinição de senha (o mesmo do "Esqueci a senha"). */
export async function staffSendStudentResetLink(
  organizationId: string,
  studentId: string,
): Promise<StaffPasswordResult> {
  const member = await db.organizationMember.findFirst({
    where: { organizationId, userId: studentId, role: "STUDENT" },
    select: { user: { select: { email: true, isActive: true } } },
  });
  if (!member) return { ok: false, error: "Aluno não encontrado." };
  if (!member.user.isActive) {
    return { ok: false, error: "Aluno inativo. Ative o aluno antes de enviar o link." };
  }
  // Aqui (ação da escola) mostramos a falha, ao contrário do "Esqueci a senha"
  // público, que não pode revelar nada sobre o e-mail.
  if (!isEmailConfigured()) {
    return {
      ok: false,
      error:
        "O envio de e-mails não está configurado no servidor. Use a senha provisória.",
    };
  }

  const link = await issueResetLink(studentId);
  try {
    await sendResetEmail(member.user.email, link);
  } catch {
    return {
      ok: false,
      error: "Não foi possível enviar o e-mail agora. Tente de novo ou use a senha provisória.",
    };
  }
  return { ok: true };
}
