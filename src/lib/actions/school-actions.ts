"use server";

import { revalidatePath } from "next/cache";

import { requireOrg } from "@/lib/tenant";
import { assertPermission } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import {
  schoolBrandingSchema,
  schoolDomainSchema,
  inviteTeamMemberSchema,
} from "@/lib/validators";
import {
  updateBranding,
  updateDomain,
  inviteTeamMember,
  removeTeamMember,
} from "@/services/school.service";

export type SettingsState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string[]> } | null;

export async function updateBrandingAction(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const ctx = await requireOrg();
  assertPermission(ctx.role, "org:manage_branding");

  const parsed = schoolBrandingSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    logoUrl: formData.get("logoUrl"),
    faviconUrl: formData.get("faviconUrl"),
    heroImageUrl: formData.get("heroImageUrl"),
    primaryColor: formData.get("primaryColor"),
    secondaryColor: formData.get("secondaryColor"),
    backgroundColor: formData.get("backgroundColor"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const ok = await updateBranding(ctx.organizationId, parsed.data);
  if (!ok) return { error: "Não foi possível salvar." };

  revalidatePath("/dashboard/settings/branding");
  return { ok: true };
}

export async function updateDomainAction(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const ctx = await requireOrg();
  assertPermission(ctx.role, "org:manage_domain");

  const parsed = schoolDomainSchema.safeParse({
    subdomain: formData.get("subdomain"),
    customDomain: formData.get("customDomain"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const result = await updateDomain(ctx.organizationId, parsed.data);
  if (!result.ok) return { error: result.error };

  revalidatePath("/dashboard/settings/domain");
  return { ok: true };
}

export async function inviteTeamMemberAction(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const ctx = await requireOrg();
  assertPermission(ctx.role, "org:manage_team");

  const parsed = inviteTeamMemberSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const result = await inviteTeamMember(ctx.organizationId, parsed.data);
  if (!result.ok) return { error: result.error };

  await audit({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: "team.invite",
    entityType: "User",
    entityId: result.userId,
    metadata: { role: parsed.data.role },
  });

  revalidatePath("/dashboard/settings/team");
  return { ok: true };
}

export async function removeTeamMemberAction(memberId: string): Promise<SettingsState> {
  const ctx = await requireOrg();
  assertPermission(ctx.role, "org:manage_team");

  const ok = await removeTeamMember(ctx.organizationId, memberId);
  if (!ok) return { error: "Não é possível remover este membro." };

  revalidatePath("/dashboard/settings/team");
  return { ok: true };
}
