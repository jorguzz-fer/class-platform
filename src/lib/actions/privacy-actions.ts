"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireOrg } from "@/lib/tenant";
import { assertPermission } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { anonymizeStudent } from "@/services/privacy.service";

export type PrivacyResult = { error?: string } | null;

/**
 * Anonimiza um aluno (direito ao esquecimento, LGPD). Requer permissão de gestão
 * de alunos. Registra a ação no AuditLog.
 */
export async function anonymizeStudentAction(studentId: string): Promise<PrivacyResult> {
  const ctx = await requireOrg();
  assertPermission(ctx.role, "student:manage");

  const result = await anonymizeStudent(ctx.organizationId, studentId);
  if (!result.ok) return { error: result.error };

  await audit({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: result.anonymized ? "student.anonymize" : "student.unlink",
    entityType: "User",
    entityId: studentId,
  });

  revalidatePath("/dashboard/students");
  redirect("/dashboard/students");
}
