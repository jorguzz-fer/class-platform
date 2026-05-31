"use server";

import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";

import { signIn, signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { registerSchema, loginSchema } from "@/lib/validators";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
} | null;

// signIn()/redirect() sinalizam sucesso lançando um erro de redirect do Next,
// identificado pelo digest "NEXT_REDIRECT". Esse erro DEVE ser repropagado.
function isRedirectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

const TRIAL_DAYS = 14;

export async function loginAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/dashboard",
    });
    return null;
  } catch (error) {
    // signIn lança um redirect em caso de sucesso — deixe-o propagar.
    if (isRedirectError(error)) throw error;
    if (error instanceof AuthError) {
      return { error: "E-mail ou senha inválidos." };
    }
    throw error;
  }
}

export async function registerAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    schoolName: formData.get("schoolName"),
    schoolSlug: formData.get("schoolSlug"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { name, email, password, schoolName, schoolSlug } = parsed.data;

  // Pré-checagem amigável de unicidade (a constraint do banco é a garantia real).
  const [existingUser, existingOrg] = await Promise.all([
    db.user.findUnique({ where: { email }, select: { id: true } }),
    db.organization.findUnique({ where: { slug: schoolSlug }, select: { id: true } }),
  ]);

  const fieldErrors: Record<string, string[]> = {};
  if (existingUser) fieldErrors.email = ["Este e-mail já está em uso."];
  if (existingOrg) fieldErrors.schoolSlug = ["Este endereço de escola já existe."];
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

  try {
    await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name, email, passwordHash, role: "ORG_OWNER" },
      });

      const organization = await tx.organization.create({
        data: {
          name: schoolName,
          slug: schoolSlug,
          status: "TRIAL",
          subscriptionStatus: "TRIALING",
          trialEndsAt,
        },
      });

      await tx.organizationMember.create({
        data: { organizationId: organization.id, userId: user.id, role: "ORG_OWNER" },
      });

      await tx.school.create({
        data: {
          organizationId: organization.id,
          name: schoolName,
          subdomain: schoolSlug,
        },
      });

      // Vincula a assinatura trial ao plano padrão, se existir (criado no seed).
      const defaultPlan = await tx.plan.findUnique({ where: { slug: "free" } });
      if (defaultPlan) {
        await tx.subscription.create({
          data: {
            organizationId: organization.id,
            planId: defaultPlan.id,
            status: "TRIALING",
            currentPeriodStart: now,
            currentPeriodEnd: trialEndsAt,
          },
        });
        await tx.organization.update({
          where: { id: organization.id },
          data: { planId: defaultPlan.id },
        });
      }
    });
  } catch {
    return { error: "Não foi possível criar a escola. Tente novamente." };
  }

  try {
    await signIn("credentials", { email, password, redirectTo: "/dashboard" });
    return null;
  } catch (error) {
    if (isRedirectError(error)) throw error;
    // Conta criada, mas auto-login falhou: oriente o usuário a logar.
    if (error instanceof AuthError) {
      return { error: "Conta criada. Faça login para continuar." };
    }
    throw error;
  }
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
