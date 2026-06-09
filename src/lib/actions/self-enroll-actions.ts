"use server";

import { AuthError } from "next-auth";

import { signIn } from "@/lib/auth";
import { selfEnrollSchema } from "@/lib/validators";
import { selfEnroll } from "@/services/self-enroll.service";
import { onEnrollmentStarted } from "@/services/events.service";

export type SelfEnrollState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
} | null;

// signIn()/redirect() sinalizam sucesso lançando um erro de redirect do Next.
function isRedirectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

export async function selfEnrollAction(
  _prev: SelfEnrollState,
  formData: FormData,
): Promise<SelfEnrollState> {
  const parsed = selfEnrollSchema.safeParse({
    schoolSlug: formData.get("schoolSlug"),
    courseSlug: formData.get("courseSlug"),
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const result = await selfEnroll(parsed.data);
  if (!result.ok) {
    if (result.code === "EXISTING_EMAIL") {
      return { fieldErrors: { email: [result.error] } };
    }
    return { error: result.error };
  }

  // Avisa o dono que a pessoa começou o curso (best-effort) antes de entrar.
  await onEnrollmentStarted(
    result.organizationId,
    result.studentName,
    result.courseTitle,
  );

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/app",
    });
    return null;
  } catch (error) {
    if (isRedirectError(error)) throw error;
    // Conta criada, mas auto-login falhou: oriente a pessoa a entrar.
    if (error instanceof AuthError) {
      return { error: "Solicitação enviada. Faça login para acompanhar." };
    }
    throw error;
  }
}
