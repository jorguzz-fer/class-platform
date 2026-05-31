"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireOrg } from "@/lib/tenant";
import { assertPermission } from "@/lib/permissions";
import {
  createStudentSchema,
  updateStudentSchema,
  createEnrollmentSchema,
} from "@/lib/validators";
import {
  createStudent,
  updateStudent,
  removeStudent,
} from "@/services/student.service";
import {
  enrollStudent,
  cancelEnrollment,
  deleteEnrollment,
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
    email: formData.get("email"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const result = await createStudent(ctx.organizationId, parsed.data);
  if (!result.ok) return { error: result.error };

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
  revalidatePath("/dashboard/students");
  redirect("/dashboard/students");
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

export async function deleteEnrollmentAction(enrollmentId: string): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertPermission(ctx.role, "enrollment:manage");

  const ok = await deleteEnrollment(ctx.organizationId, enrollmentId);
  if (!ok) return { error: "Matrícula não encontrada." };

  revalidatePath("/dashboard/enrollments");
  return null;
}
