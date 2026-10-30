"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireOrg } from "@/lib/tenant";
import { assertPermission } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { onEnrollmentCreated, onStudentCreated } from "@/services/events.service";
import {
  issueCertificateForEnrollment,
  issuePendingCertificates,
} from "@/services/certificate.service";
import {
  createStudentSchema,
  updateStudentSchema,
  createEnrollmentSchema,
  updateEnrollmentSchema,
  studentOperationsSchema,
} from "@/lib/validators";
import {
  createStudent,
  updateStudent,
  removeStudent,
  setStudentActive,
  resolveStudentOperation,
  setStudentOperation,
  setStudentOperations,
} from "@/services/student.service";
import {
  enrollStudent,
  cancelEnrollment,
  deleteEnrollment,
  updateEnrollment,
  approveEnrollment,
  rejectEnrollment,
} from "@/services/enrollment.service";

export type ActionResult = { error?: string; fieldErrors?: Record<string, string[]> } | null;

// ---- Alunos --------------------------------------------------------------

export async function createStudentAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertPermission(ctx.role, "student:manage");

  const parsed = createStudentSchema.safeParse({
    name: formData.get("name"),
    cpf: formData.get("cpf"),
    email: formData.get("email"),
    operation: formData.get("operation") ?? undefined,
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const operation = await resolveStudentOperation(ctx.organizationId, parsed.data.operation);
  if (!operation.ok) return { fieldErrors: { operation: ["Operação inválida."] } };

  const result = await createStudent(ctx.organizationId, {
    ...parsed.data,
    operation: operation.value ?? undefined,
  });
  if (!result.ok) return { error: result.error };

  await audit({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: "student.create",
    entityType: "User",
    entityId: result.studentId,
  });
  await onStudentCreated(ctx.organizationId, result.studentId);

  revalidatePath("/dashboard/students");
  redirect(`/dashboard/students/${result.studentId}`);
}

export async function updateStudentAction(
  studentId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertPermission(ctx.role, "student:manage");

  const parsed = updateStudentSchema.safeParse({
    name: formData.get("name"),
    isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const ok = await updateStudent(ctx.organizationId, studentId, parsed.data);
  if (!ok) return { error: "Aluno não encontrado." };

  revalidatePath(`/dashboard/students/${studentId}`);
  revalidatePath("/dashboard/students");
  return null;
}

export async function removeStudentAction(studentId: string): Promise<void> {
  const ctx = await requireOrg();
  assertPermission(ctx.role, "student:manage");

  await removeStudent(ctx.organizationId, studentId);

  await audit({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: "student.remove",
    entityType: "User",
    entityId: studentId,
  });

  revalidatePath("/dashboard/students");
  redirect("/dashboard/students");
}

/** Define (ou limpa) a operação de um aluno, direto na página dele. */
export async function setStudentOperationAction(
  studentId: string,
  operation: string,
): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertPermission(ctx.role, "student:manage");

  const resolved = await resolveStudentOperation(ctx.organizationId, operation);
  if (!resolved.ok) return { error: "Operação inválida." };

  const ok = await setStudentOperation(ctx.organizationId, studentId, resolved.value);
  if (!ok) return { error: "Aluno não encontrado." };

  revalidatePath("/dashboard/students");
  revalidatePath(`/dashboard/students/${studentId}`);
  return null;
}

/** Salva a lista de operações da escola (Configurações → Operações). */
export async function saveStudentOperationsAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertPermission(ctx.role, "student:manage");

  const parsed = studentOperationsSchema.safeParse(formData.get("operations") ?? "");
  if (!parsed.success) {
    return { fieldErrors: { operations: parsed.error.issues.map((i) => i.message) } };
  }

  await setStudentOperations(ctx.organizationId, parsed.data);

  revalidatePath("/dashboard/settings/operations");
  revalidatePath("/dashboard/students");
  return null;
}

/** Ativa/inativa um aluno direto na lista. */
export async function setStudentActiveAction(
  studentId: string,
  isActive: boolean,
): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertPermission(ctx.role, "student:manage");

  const ok = await setStudentActive(ctx.organizationId, studentId, isActive);
  if (!ok) return { error: "Aluno não encontrado." };

  await audit({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: isActive ? "student.activate" : "student.deactivate",
    entityType: "User",
    entityId: studentId,
  });

  revalidatePath("/dashboard/students");
  revalidatePath(`/dashboard/students/${studentId}`);
  return null;
}

// ---- Matrículas ----------------------------------------------------------

export async function enrollStudentAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertPermission(ctx.role, "enrollment:manage");

  const parsed = createEnrollmentSchema.safeParse({
    studentId: formData.get("studentId"),
    courseId: formData.get("courseId"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const result = await enrollStudent(
    ctx.organizationId,
    parsed.data.studentId,
    parsed.data.courseId,
  );
  if (!result.ok) return { error: result.error };

  // Notifica o aluno (e-mail/WhatsApp) e dispara webhooks.
  await onEnrollmentCreated(
    ctx.organizationId,
    parsed.data.studentId,
    parsed.data.courseId,
  );

  revalidatePath("/dashboard/enrollments");
  revalidatePath(`/dashboard/students/${parsed.data.studentId}`);
  return null;
}

export async function cancelEnrollmentAction(enrollmentId: string): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertPermission(ctx.role, "enrollment:manage");

  const ok = await cancelEnrollment(ctx.organizationId, enrollmentId);
  if (!ok) return { error: "Matrícula não encontrada." };

  revalidatePath("/dashboard/enrollments");
  return null;
}

/** Edita manualmente o status e a data de uma matrícula. */
export async function updateEnrollmentAction(
  enrollmentId: string,
  input: { status: string; enrolledAt: string },
): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertPermission(ctx.role, "enrollment:manage");

  const parsed = updateEnrollmentSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  // Ancoramos a data ao meio-dia UTC para não "voltar um dia" por fuso.
  const enrolledAt = new Date(`${parsed.data.enrolledAt}T12:00:00.000Z`);

  const ok = await updateEnrollment(ctx.organizationId, enrollmentId, {
    status: parsed.data.status,
    enrolledAt,
  });
  if (!ok) return { error: "Matrícula não encontrada." };

  // Marcou como Concluída: emite o certificado automaticamente (idempotente).
  if (parsed.data.status === "COMPLETED") {
    try {
      await issueCertificateForEnrollment(ctx.organizationId, enrollmentId);
    } catch {
      // best-effort: dá para emitir depois pelo botão em Matrículas.
    }
    revalidatePath("/dashboard/certificates");
  }

  revalidatePath("/dashboard/enrollments");
  return null;
}

/** Emite o certificado de uma matrícula concluída (pelo admin). */
export async function issueEnrollmentCertificateAction(
  enrollmentId: string,
): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertPermission(ctx.role, "enrollment:manage");

  const result = await issueCertificateForEnrollment(ctx.organizationId, enrollmentId);
  if (!result.ok) return { error: result.error };

  revalidatePath("/dashboard/enrollments");
  revalidatePath("/dashboard/certificates");
  return null;
}

/** Emite de uma vez os certificados de todas as matrículas concluídas pendentes. */
export async function issuePendingCertificatesAction(): Promise<
  { error: string } | { issued: number; failed: number }
> {
  const ctx = await requireOrg();
  assertPermission(ctx.role, "enrollment:manage");

  const result = await issuePendingCertificates(ctx.organizationId);

  revalidatePath("/dashboard/enrollments");
  revalidatePath("/dashboard/certificates");
  return result;
}

export async function deleteEnrollmentAction(enrollmentId: string): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertPermission(ctx.role, "enrollment:manage");

  const ok = await deleteEnrollment(ctx.organizationId, enrollmentId);
  if (!ok) return { error: "Matrícula não encontrada." };

  revalidatePath("/dashboard/enrollments");
  return null;
}

export async function approveEnrollmentAction(enrollmentId: string): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertPermission(ctx.role, "enrollment:manage");

  const result = await approveEnrollment(ctx.organizationId, enrollmentId);
  if (!result.ok) return { error: result.error };

  await audit({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: "enrollment.approve",
    entityType: "Enrollment",
    entityId: enrollmentId,
  });

  // Reaproveita o e-mail "acesso liberado" + webhook de matrícula.
  await onEnrollmentCreated(ctx.organizationId, result.studentId, result.courseId);

  revalidatePath("/dashboard/enrollments");
  return null;
}

export async function rejectEnrollmentAction(enrollmentId: string): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertPermission(ctx.role, "enrollment:manage");

  const ok = await rejectEnrollment(ctx.organizationId, enrollmentId);
  if (!ok) return { error: "Solicitação não encontrada." };

  await audit({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: "enrollment.reject",
    entityType: "Enrollment",
    entityId: enrollmentId,
  });

  revalidatePath("/dashboard/enrollments");
  return null;
}
