"use server";

import { revalidatePath } from "next/cache";

import { requireOrg } from "@/lib/tenant";
import { assertPermission } from "@/lib/permissions";
import { moduleSchema, lessonSchema } from "@/lib/validators";
import { getVideoProvider } from "@/lib/video/registry";
import type { LessonServiceInput } from "@/services/lesson.service";
import {
  createModule,
  updateModule,
  deleteModule,
  reorderModules,
} from "@/services/module.service";
import {
  createLesson,
  updateLesson,
  deleteLesson,
  reorderLessons,
} from "@/services/lesson.service";

export type ActionResult = { error?: string; fieldErrors?: Record<string, string[]> } | null;

function revalidateCourse(courseId: string) {
  revalidatePath(`/dashboard/courses/${courseId}/modules`);
  revalidatePath(`/dashboard/courses/${courseId}`);
}

// ---- Módulos -------------------------------------------------------------

export async function createModuleAction(
  courseId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertPermission(ctx.role, "course:edit");

  const parsed = moduleSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const created = await createModule(ctx.organizationId, courseId, parsed.data);
  if (!created) return { error: "Curso não encontrado." };

  revalidateCourse(courseId);
  return null;
}

export async function updateModuleAction(
  courseId: string,
  moduleId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertPermission(ctx.role, "course:edit");

  const parsed = moduleSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const ok = await updateModule(ctx.organizationId, moduleId, parsed.data);
  if (!ok) return { error: "Módulo não encontrado." };

  revalidateCourse(courseId);
  return null;
}

export async function deleteModuleAction(courseId: string, moduleId: string): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertPermission(ctx.role, "course:edit");

  const ok = await deleteModule(ctx.organizationId, moduleId);
  if (!ok) return { error: "Módulo não encontrado." };

  revalidateCourse(courseId);
  return null;
}

export async function reorderModulesAction(
  courseId: string,
  orderedIds: string[],
): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertPermission(ctx.role, "course:edit");

  await reorderModules(ctx.organizationId, courseId, orderedIds);
  revalidateCourse(courseId);
  return null;
}

// ---- Aulas ---------------------------------------------------------------

function parseLesson(formData: FormData) {
  // FormData.get() devolve null quando o campo não existe no form (ex.: o form
  // de aula não tem "description"; videoProvider/Source somem quando o tipo não
  // é vídeo). Os schemas opcionais aceitam undefined/"" — não null. Converter
  // null→undefined evita uma falha de validação num campo invisível.
  return lessonSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? undefined,
    contentType: formData.get("contentType") ?? undefined,
    videoProvider: formData.get("videoProvider") ?? undefined,
    videoSource: formData.get("videoSource") ?? undefined,
    textContent: formData.get("textContent") ?? undefined,
    durationMinutes: formData.get("durationMinutes") || undefined,
    isPreview: formData.get("isPreview") === "on" || formData.get("isPreview") === "true",
    isRequired: formData.get("isRequired") === "on" || formData.get("isRequired") === "true",
  });
}

/**
 * Converte os dados do formulário (com `videoSource`) no formato do serviço,
 * normalizando a fonte do vídeo via o registry.
 *
 * Importante p/ EDIÇÃO: se `videoSource` vier vazio, os campos de vídeo ficam
 * `undefined` (= "não alterar"). Assim, editar outros campos (título, duração)
 * não apaga o vídeo já configurado. Em criação, undefined vira null no serviço.
 */
function toLessonInput(
  data: ReturnType<typeof lessonSchema.parse>,
): LessonServiceInput {
  const provider = getVideoProvider(data.videoProvider || null);
  const hasNewSource = !!(provider && data.videoSource);
  const parsed = hasNewSource
    ? provider!.parse(data.videoSource!)
    : { videoId: null, videoUrl: null };

  return {
    title: data.title,
    description: data.description,
    contentType: data.contentType,
    // undefined = manter o que já existe (não sobrescreve na edição).
    videoProvider: hasNewSource ? provider!.id : undefined,
    videoId: hasNewSource ? parsed.videoId : undefined,
    videoUrl: hasNewSource ? parsed.videoUrl : undefined,
    textContent: data.textContent,
    durationMinutes: data.durationMinutes,
    isPreview: data.isPreview,
    isRequired: data.isRequired,
  };
}

export async function createLessonAction(
  courseId: string,
  moduleId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertPermission(ctx.role, "course:edit");

  const parsed = parseLesson(formData);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const created = await createLesson(ctx.organizationId, moduleId, toLessonInput(parsed.data));
  if (!created) return { error: "Módulo não encontrado." };

  revalidateCourse(courseId);
  return null;
}

export async function updateLessonAction(
  courseId: string,
  lessonId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertPermission(ctx.role, "course:edit");

  const parsed = parseLesson(formData);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const ok = await updateLesson(ctx.organizationId, lessonId, toLessonInput(parsed.data));
  if (!ok) return { error: "Aula não encontrada." };

  revalidateCourse(courseId);
  return null;
}

export async function deleteLessonAction(courseId: string, lessonId: string): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertPermission(ctx.role, "course:edit");

  const ok = await deleteLesson(ctx.organizationId, lessonId);
  if (!ok) return { error: "Aula não encontrada." };

  revalidateCourse(courseId);
  return null;
}

export async function reorderLessonsAction(
  courseId: string,
  moduleId: string,
  orderedIds: string[],
): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertPermission(ctx.role, "course:edit");

  await reorderLessons(ctx.organizationId, moduleId, orderedIds);
  revalidateCourse(courseId);
  return null;
}
