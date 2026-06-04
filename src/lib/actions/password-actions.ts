"use server";

import { forgotPasswordSchema, resetPasswordSchema } from "@/lib/validators";
import {
  requestPasswordReset,
  resetPassword,
} from "@/services/password-reset.service";

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

  await requestPasswordReset(parsed.data.email);
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
