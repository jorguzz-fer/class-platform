"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireSuperAdmin } from "@/lib/tenant";
import { audit } from "@/lib/audit";
import { adminUpdateUserSchema, adminResetPasswordSchema } from "@/lib/validators";
import {
  setOrganizationStatus,
  setOrganizationPlan,
  updateUserAsAdmin,
  adminResetUserPassword,
  type OrgStatus,
} from "@/services/admin.service";

export type AdminResult = { error?: string } | null;
export type AdminFormResult =
  | { ok?: boolean; error?: string; fieldErrors?: Record<string, string[]> }
  | null;

export async function setOrganizationStatusAction(
  organizationId: string,
  status: OrgStatus,
): Promise<AdminResult> {
  const ctx = await requireSuperAdmin();

  const ok = await setOrganizationStatus(organizationId, status);
  if (!ok) return { error: "Não foi possível atualizar a organização." };

  await audit({
    organizationId,
    userId: ctx.userId,
    action: "admin.org_status_change",
    entityType: "Organization",
    entityId: organizationId,
    metadata: { status },
  });

  revalidatePath("/admin/organizations");
  return null;
}

export async function setOrganizationPlanAction(
  organizationId: string,
  planId: string,
): Promise<AdminResult> {
  const ctx = await requireSuperAdmin();

  const ok = await setOrganizationPlan(organizationId, planId);
  if (!ok) return { error: "Não foi possível atualizar o plano." };

  await audit({
    organizationId,
    userId: ctx.userId,
    action: "admin.org_plan_change",
    entityType: "Organization",
    entityId: organizationId,
    metadata: { planId },
  });

  revalidatePath("/admin/organizations");
  return null;
}

export async function updateUserAction(
  userId: string,
  _prev: AdminFormResult,
  formData: FormData,
): Promise<AdminFormResult> {
  const ctx = await requireSuperAdmin();

  const parsed = adminUpdateUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
    isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  // Trava: o super admin não pode rebaixar nem desativar a própria conta
  // (evita ficar trancado para fora do painel).
  if (
    userId === ctx.userId &&
    (parsed.data.role !== "SUPER_ADMIN" || !parsed.data.isActive)
  ) {
    return {
      error: "Você não pode rebaixar nem desativar a sua própria conta.",
    };
  }

  const result = await updateUserAsAdmin(userId, parsed.data);
  if (!result.ok) return { error: result.error };

  await audit({
    organizationId: null,
    userId: ctx.userId,
    action: "admin.user_update",
    entityType: "User",
    entityId: userId,
    metadata: {
      email: parsed.data.email,
      role: parsed.data.role,
      isActive: parsed.data.isActive,
    },
  });

  revalidatePath("/admin/users");
  redirect("/admin/users");
}

/**
 * Redefine a senha de um usuário pelo painel da plataforma (SUPER_ADMIN).
 * Permanece na mesma página (sem redirect) e devolve `ok` para a UI confirmar.
 * A nova senha NUNCA é registrada no audit (apenas o fato de ter sido trocada).
 */
export async function resetUserPasswordAction(
  userId: string,
  _prev: AdminFormResult,
  formData: FormData,
): Promise<AdminFormResult> {
  const ctx = await requireSuperAdmin();

  const parsed = adminResetPasswordSchema.safeParse({
    password: formData.get("password"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const ok = await adminResetUserPassword(userId, parsed.data.password);
  if (!ok) return { error: "Usuário não encontrado." };

  await audit({
    organizationId: null,
    userId: ctx.userId,
    action: "admin.user_password_reset",
    entityType: "User",
    entityId: userId,
  });

  return { ok: true };
}
