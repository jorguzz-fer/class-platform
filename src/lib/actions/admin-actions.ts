"use server";

import { revalidatePath } from "next/cache";

import { requireSuperAdmin } from "@/lib/tenant";
import { audit } from "@/lib/audit";
import { setOrganizationStatus, type OrgStatus } from "@/services/admin.service";

export type AdminResult = { error?: string } | null;

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
