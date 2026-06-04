"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireOrg } from "@/lib/tenant";
import { assertPermission } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import {
  createCompanySchema,
  addManagerSchema,
  createCohortSchema,
} from "@/lib/validators";
import {
  createCompany,
  deleteCompany,
  addCompanyManager,
  removeCompanyManager,
  createCohort,
  addStudentToCohort,
} from "@/services/company.service";

export type CompanyState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string[]> } | null;

// B2B é gerido por quem administra a escola (owner/admin). Usamos org:manage_team
// como permissão (gerir pessoas/estruturas da escola).
const PERM = "org:manage_team" as const;

export async function createCompanyAction(
  _prev: CompanyState,
  formData: FormData,
): Promise<CompanyState> {
  const ctx = await requireOrg();
  assertPermission(ctx.role, PERM);

  const parsed = createCompanySchema.safeParse({
    name: formData.get("name"),
    cnpj: formData.get("cnpj"),
    contactEmail: formData.get("contactEmail"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const company = await createCompany(ctx.organizationId, parsed.data);
  await audit({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: "company.create",
    entityType: "Company",
    entityId: company.id,
  });

  revalidatePath("/dashboard/companies");
  redirect(`/dashboard/companies/${company.id}`);
}

export async function deleteCompanyAction(companyId: string): Promise<void> {
  const ctx = await requireOrg();
  assertPermission(ctx.role, PERM);
  await deleteCompany(ctx.organizationId, companyId);
  revalidatePath("/dashboard/companies");
  redirect("/dashboard/companies");
}

export async function addManagerAction(
  companyId: string,
  _prev: CompanyState,
  formData: FormData,
): Promise<CompanyState> {
  const ctx = await requireOrg();
  assertPermission(ctx.role, PERM);

  const parsed = addManagerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const result = await addCompanyManager(ctx.organizationId, companyId, parsed.data);
  if (!result.ok) return { error: result.error };

  revalidatePath(`/dashboard/companies/${companyId}`);
  return { ok: true };
}

export async function removeManagerAction(
  companyId: string,
  memberId: string,
): Promise<CompanyState> {
  const ctx = await requireOrg();
  assertPermission(ctx.role, PERM);

  const ok = await removeCompanyManager(ctx.organizationId, companyId, memberId);
  if (!ok) return { error: "Gestor não encontrado." };

  revalidatePath(`/dashboard/companies/${companyId}`);
  return { ok: true };
}

export async function createCohortAction(
  companyId: string,
  _prev: CompanyState,
  formData: FormData,
): Promise<CompanyState> {
  const ctx = await requireOrg();
  assertPermission(ctx.role, PERM);

  const parsed = createCohortSchema.safeParse({
    companyId,
    courseId: formData.get("courseId"),
    name: formData.get("name"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const result = await createCohort(ctx.organizationId, parsed.data);
  if (!result.ok) return { error: result.error };

  revalidatePath(`/dashboard/companies/${companyId}`);
  return { ok: true };
}

export async function addStudentToCohortAction(
  cohortId: string,
  studentId: string,
): Promise<CompanyState> {
  const ctx = await requireOrg();
  assertPermission(ctx.role, PERM);

  const result = await addStudentToCohort(ctx.organizationId, cohortId, studentId);
  if (!result.ok) return { error: result.error };

  revalidatePath(`/dashboard/companies`);
  return { ok: true };
}
