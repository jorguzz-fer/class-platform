import { z } from "zod";

/**
 * Schemas Zod — toda entrada externa é validada antes de tocar o banco.
 */

// Slug: minúsculas, números e hífens; usado para subdomínio da escola.
const slugSchema = z
  .string()
  .trim()
  .min(3, "Mínimo de 3 caracteres")
  .max(40, "Máximo de 40 caracteres")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use apenas letras minúsculas, números e hífens",
  );

const passwordSchema = z
  .string()
  .min(8, "A senha deve ter pelo menos 8 caracteres")
  .max(72, "A senha deve ter no máximo 72 caracteres"); // limite do bcrypt

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome").max(120),
  email: z.string().trim().toLowerCase().email("E-mail inválido").max(160),
  password: passwordSchema,
  schoolName: z.string().trim().min(2, "Informe o nome da escola").max(120),
  schoolSlug: slugSchema,
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
