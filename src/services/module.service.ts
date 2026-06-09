import { db } from "@/lib/db";
import type { ModuleInput } from "@/lib/validators";

/**
 * Serviço de Módulos (SPEC §14.5). Toda função é escopada por organizationId.
 */

/** Confirma que o curso pertence à organização. */
async function assertCourseInOrg(organizationId: string, courseId: string) {
  const course = await db.course.findFirst({
    where: { id: courseId, organizationId },
    select: { id: true },
  });
  return !!course;
}

export function listModules(organizationId: string, courseId: string) {
  return db.module.findMany({
    where: { organizationId, courseId },
    orderBy: { orderIndex: "asc" },
    include: {
      lessons: {
        orderBy: { orderIndex: "asc" },
        select: {
          id: true,
          title: true,
          contentType: true,
          isRequired: true,
          isPreview: true,
          orderIndex: true,
          attachments: {
            orderBy: { createdAt: "asc" },
            select: { id: true, fileName: true, fileUrl: true },
          },
        },
      },
      quiz: {
        select: {
          id: true,
          isPublished: true,
          _count: { select: { questions: true } },
        },
      },
    },
  });
}

/** Carrega um módulo da organização (id, título, curso). */
export function getModule(organizationId: string, moduleId: string) {
  return db.module.findFirst({
    where: { id: moduleId, organizationId },
    select: { id: true, title: true, courseId: true },
  });
}

export async function createModule(
  organizationId: string,
  courseId: string,
  input: ModuleInput,
) {
  if (!(await assertCourseInOrg(organizationId, courseId))) return null;

  // Próximo índice de ordenação = quantos já existem.
  const count = await db.module.count({ where: { organizationId, courseId } });

  return db.module.create({
    data: {
      organizationId,
      courseId,
      title: input.title,
      description: input.description || null,
      orderIndex: count,
    },
  });
}

export async function updateModule(
  organizationId: string,
  moduleId: string,
  input: ModuleInput,
) {
  const result = await db.module.updateMany({
    where: { id: moduleId, organizationId },
    data: { title: input.title, description: input.description || null },
  });
  return result.count > 0;
}

export async function deleteModule(organizationId: string, moduleId: string) {
  // onDelete: Cascade no schema remove as aulas do módulo.
  const result = await db.module.deleteMany({
    where: { id: moduleId, organizationId },
  });
  return result.count > 0;
}

/**
 * Reordena os módulos de um curso conforme a lista de ids fornecida.
 * Aplica em transação e só considera ids que pertencem ao curso/org.
 */
export async function reorderModules(
  organizationId: string,
  courseId: string,
  orderedIds: string[],
) {
  const owned = await db.module.findMany({
    where: { organizationId, courseId },
    select: { id: true },
  });
  const ownedIds = new Set(owned.map((m) => m.id));
  const valid = orderedIds.filter((id) => ownedIds.has(id));

  await db.$transaction(
    valid.map((id, index) =>
      db.module.update({ where: { id }, data: { orderIndex: index } }),
    ),
  );
  return true;
}
