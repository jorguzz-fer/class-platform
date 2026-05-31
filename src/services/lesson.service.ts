import { db } from "@/lib/db";
import type { LessonInput } from "@/lib/validators";

/**
 * Serviço de Aulas (SPEC §14.6). Toda aula pertence a um módulo e a um curso,
 * sempre escopada por organizationId.
 */

async function getModuleInOrg(organizationId: string, moduleId: string) {
  return db.module.findFirst({
    where: { id: moduleId, organizationId },
    select: { id: true, courseId: true },
  });
}

export function getLesson(organizationId: string, lessonId: string) {
  return db.lesson.findFirst({
    where: { id: lessonId, organizationId },
  });
}

export async function createLesson(
  organizationId: string,
  moduleId: string,
  input: LessonInput,
) {
  const mod = await getModuleInOrg(organizationId, moduleId);
  if (!mod) return null;

  const count = await db.lesson.count({ where: { organizationId, moduleId } });

  return db.lesson.create({
    data: {
      organizationId,
      courseId: mod.courseId,
      moduleId,
      title: input.title,
      description: input.description || null,
      contentType: input.contentType,
      videoProvider: input.videoProvider || null,
      videoId: input.videoId || null,
      videoUrl: input.videoUrl || null,
      textContent: input.textContent || null,
      durationMinutes: input.durationMinutes ?? null,
      isPreview: input.isPreview,
      isRequired: input.isRequired,
      orderIndex: count,
    },
  });
}

export async function updateLesson(
  organizationId: string,
  lessonId: string,
  input: LessonInput,
) {
  const result = await db.lesson.updateMany({
    where: { id: lessonId, organizationId },
    data: {
      title: input.title,
      description: input.description || null,
      contentType: input.contentType,
      videoProvider: input.videoProvider || null,
      videoId: input.videoId || null,
      videoUrl: input.videoUrl || null,
      textContent: input.textContent || null,
      durationMinutes: input.durationMinutes ?? null,
      isPreview: input.isPreview,
      isRequired: input.isRequired,
    },
  });
  return result.count > 0;
}

export async function deleteLesson(organizationId: string, lessonId: string) {
  const result = await db.lesson.deleteMany({
    where: { id: lessonId, organizationId },
  });
  return result.count > 0;
}

/** Reordena as aulas dentro de um módulo. */
export async function reorderLessons(
  organizationId: string,
  moduleId: string,
  orderedIds: string[],
) {
  const owned = await db.lesson.findMany({
    where: { organizationId, moduleId },
    select: { id: true },
  });
  const ownedIds = new Set(owned.map((l) => l.id));
  const valid = orderedIds.filter((id) => ownedIds.has(id));

  await db.$transaction(
    valid.map((id, index) =>
      db.lesson.update({ where: { id }, data: { orderIndex: index } }),
    ),
  );
  return true;
}
