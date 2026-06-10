"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireOrg } from "@/lib/tenant";
import { assertPermission } from "@/lib/permissions";
import { onCoursePublished } from "@/services/events.service";
import { createCourseSchema, updateCourseSchema } from "@/lib/validators";
import {
  createCourse,
  updateCourse,
  deleteCourse,
  publishCourse,
  setCourseStatus,
} from "@/services/course.service";

export type CourseFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
} | null;

export async function createCourseAction(
  _prev: CourseFormState,
  formData: FormData,
): Promise<CourseFormState> {
  const ctx = await requireOrg();
  assertPermission(ctx.role, "course:create");

  const parsed = createCourseSchema.safeParse({
    title: formData.get("title"),
    subtitle: formData.get("subtitle"),
    description: formData.get("description"),
    level: formData.get("level") ?? undefined,
    visibility: formData.get("visibility") ?? undefined,
    category: formData.get("category"),
    thumbnailUrl: formData.get("thumbnailUrl"),
    price: formData.get("price") || undefined,
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const course = await createCourse(ctx.organizationId, ctx.userId, parsed.data);
  revalidatePath("/dashboard/courses");
  redirect(`/dashboard/courses/${course.id}`);
}

export async function updateCourseAction(
  courseId: string,
  _prev: CourseFormState,
  formData: FormData,
): Promise<CourseFormState> {
  const ctx = await requireOrg();
  assertPermission(ctx.role, "course:edit");

  const parsed = updateCourseSchema.safeParse({
    title: formData.get("title"),
    subtitle: formData.get("subtitle"),
    description: formData.get("description"),
    level: formData.get("level") ?? undefined,
    visibility: formData.get("visibility") ?? undefined,
    category: formData.get("category"),
    thumbnailUrl: formData.get("thumbnailUrl"),
    price: formData.get("price") || undefined,
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const updated = await updateCourse(ctx.organizationId, courseId, parsed.data);
  if (!updated) return { error: "Curso não encontrado." };

  revalidatePath(`/dashboard/courses/${courseId}`);
  revalidatePath("/dashboard/courses");
  return null;
}

export async function publishCourseAction(courseId: string): Promise<CourseFormState> {
  const ctx = await requireOrg();
  assertPermission(ctx.role, "course:edit");

  const result = await publishCourse(ctx.organizationId, courseId);
  if (!result.ok) return { error: result.error };

  await onCoursePublished(ctx.organizationId, courseId);

  revalidatePath(`/dashboard/courses/${courseId}`);
  revalidatePath("/dashboard/courses");
  return null;
}

export async function archiveCourseAction(courseId: string): Promise<CourseFormState> {
  const ctx = await requireOrg();
  assertPermission(ctx.role, "course:edit");

  const ok = await setCourseStatus(ctx.organizationId, courseId, "ARCHIVED");
  if (!ok) return { error: "Curso não encontrado." };

  revalidatePath(`/dashboard/courses/${courseId}`);
  revalidatePath("/dashboard/courses");
  return null;
}

export async function unarchiveCourseAction(courseId: string): Promise<CourseFormState> {
  const ctx = await requireOrg();
  assertPermission(ctx.role, "course:edit");

  const ok = await setCourseStatus(ctx.organizationId, courseId, "DRAFT");
  if (!ok) return { error: "Curso não encontrado." };

  revalidatePath(`/dashboard/courses/${courseId}`);
  revalidatePath("/dashboard/courses");
  return null;
}

export async function deleteCourseAction(courseId: string): Promise<void> {
  const ctx = await requireOrg();
  assertPermission(ctx.role, "course:delete");

  await deleteCourse(ctx.organizationId, courseId);
  revalidatePath("/dashboard/courses");
  redirect("/dashboard/courses");
}
