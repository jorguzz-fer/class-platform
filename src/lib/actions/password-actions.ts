"use server";

import { forgotPasswordSchema, resetPasswordSchema } from "@/lib/validators";
import {
  requestPasswordReset,
  resetPassword,
} from "@/services/password-reset.service";
import { getClientIp } from "@/lib/request-info";
import { rateLimit } from "@/lib/rateLimit";

export type PasswordFormState =
  | { ok?: boolean; error?: string; fieldErrors?: Record<string, string[]> }
  | null;

/**
 * Solicita o e-mail de redefinição. Resposta SEMPRE genérica (ok=true), para
 * não revelar se o e-mail existe (enumeração de usuários).
 */
export async function forgotPasswordAction(
  _prev: PasswordFormState,
  formData: FormData,
): Promise<PasswordFormState> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  // Rate limit anti-spam de e-mail e anti-enumeração: por IP e por e-mail. Ao
  // estourar, mantém a resposta genérica (ok=true) sem enviar — não revela nem a
  // existência do e-mail nem que houve bloqueio.
  const ip = (await getClientIp()) ?? "unknown";
  const email = parsed.data.email;
  const ipAllowed = (
    await rateLimit({ key: `reset:ip:${ip}`, windowSec: 3600, max: 5 })
  ).allowed;
  const emailAllowed = (
    await rateLimit({ key: `reset:email:${email}`, windowSec: 3600, max: 3 })
  ).allowed;
  if (ipAllowed && emailAllowed) {
    await requestPasswordReset(email);
  }
  return { ok: true };
}

/** Redefine a senha a partir do token. */
export async function resetPasswordAction(
  _prev: PasswordFormState,
  formData: FormData,
): Promise<PasswordFormState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const result = await resetPassword(parsed.data.token, parsed.data.password);
  if (!result.ok) return { error: result.error };
  return { ok: true };
}
