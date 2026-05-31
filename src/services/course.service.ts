import { Prisma, type CourseStatus } from "@prisma/client";

import { db } from "@/lib/db";
import { slugify } from "@/lib/slug";
import type { CreateCourseInput, UpdateCourseInput } from "@/lib/validators";

/**
 * Camada de serviço de Cursos (SPEC §14.4).
 *
 * Regra de ouro do multi-tenant: TODA função recebe `organizationId` como
 * primeiro argumento e o aplica no filtro. Nunca confie em ids vindos do
 * cliente para escopo de tenant.
 */

export function listCourses(organizationId: string) {
  return db.course.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    include: {
      instructor: { select: { id: true, name: true } },
      _count: { select: { modules: true, lessons: true, enrollments: true } },
    },
  });
}

/** Cursos elegíveis para matrícula (não arquivados), só id/título. */
export function listEnrollableCourses(organizationId: string) {
  return db.course.findMany({
    where: { organizationId, status: { not: "ARCHIVED" } },
    orderBy: { title: "asc" },
    select: { id: true, title: true },
  });
}

export function getCourse(organizationId: string, courseId: string) {
  return db.course.findFirst({
    where: { id: courseId, organizationId },
    include: {
      _count: { select: { modules: true, lessons: true, enrollments: true } },
    },
  });
}

/** Gera um slug único dentro da organização (sufixa -2, -3, ... se colidir). */
async function uniqueCourseSlug(
  organizationId: string,
  title: string,
): Promise<string> {
  const base = slugify(title) || "curso";
  let slug = base;
  let suffix = 2;
  // @@unique([organizationId, slug]) garante a integridade real; este loop
  // só melhora a UX evitando o erro na maioria dos casos.
  while (
    await db.course.findFirst({
      where: { organizationId, slug },
      select: { id: true },
    })
  ) {
    slug = `${base}-${suffix++}`;
  }
  return slug;
}

export async function createCourse(
  organizationId: string,
  instructorId: string,
  input: CreateCourseInput,
) {
  const slug = await uniqueCourseSlug(organizationId, input.title);

  return db.course.create({
    data: {
      organizationId,
      instructorId,
      title: input.title,
      slug,
      subtitle: input.subtitle || null,
      description: input.description || null,
      level: input.level,
      visibility: input.visibility,
      category: input.category || null,
      status: "DRAFT",
    },
  });
}

export async function updateCourse(
  organizationId: string,
  courseId: string,
  input: UpdateCourseInput,
) {
  // Garante que o curso pertence à org antes de atualizar.
  const existing = await db.course.findFirst({
    where: { id: courseId, organizationId },
    select: { id: true },
  });
  if (!existing) return null;

  return db.course.update({
    where: { id: courseId },
    data: {
      title: input.title,
      subtitle: input.subtitle || null,
      description: input.description || null,
      level: input.level,
      visibility: input.visibility,
      category: input.category || null,
      thumbnailUrl: input.thumbnailUrl || null,
      price: input.price != null ? new Prisma.Decimal(input.price) : null,
    },
  });
}

export async function deleteCourse(organizationId: string, courseId: string) {
  const result = await db.course.deleteMany({
    where: { id: courseId, organizationId },
  });
  return result.count > 0;
}

/**
 * Regra de publicação (SPEC §11.2): curso só pode ser publicado se tiver ao
 * menos um módulo e uma aula.
 */
export async function publishCourse(organizationId: string, courseId: string) {
  const course = await db.course.findFirst({
    where: { id: courseId, organizationId },
    select: {
      id: true,
      _count: { select: { modules: true, lessons: true } },
    },
  });
  if (!course) return { ok: false as const, error: "Curso não encontrado." };
  if (course._count.modules < 1 || course._count.lessons < 1) {
    return {
      ok: false as const,
      error: "O curso precisa de pelo menos um módulo e uma aula para ser publicado.",
    };
  }

  await db.course.update({
    where: { id: courseId },
    data: { status: "PUBLISHED", publishedAt: new Date() },
  });
  return { ok: true as const };
}

export async function setCourseStatus(
  organizationId: string,
  courseId: string,
  status: Extract<CourseStatus, "DRAFT" | "ARCHIVED">,
) {
  const result = await db.course.updateMany({
    where: { id: courseId, organizationId },
    data: { status },
  });
  return result.count > 0;
}
