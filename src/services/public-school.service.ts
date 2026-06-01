import { db } from "@/lib/db";

/**
 * Vitrine pública da escola (SPEC §9.5). Sem autenticação.
 * Mostra apenas escolas de organizações ATIVAS/TRIAL e cursos PUBLISHED com
 * visibilidade pública (PUBLIC/UNLISTED não entram na listagem geral).
 */

export async function getPublicSchool(slug: string) {
  const school = await db.school.findFirst({
    where: {
      subdomain: slug,
      organization: { status: { in: ["ACTIVE", "TRIAL"] } },
    },
    select: {
      id: true,
      organizationId: true,
      name: true,
      description: true,
      logoUrl: true,
      primaryColor: true,
    },
  });
  return school;
}

export function listPublicCourses(organizationId: string) {
  return db.course.findMany({
    where: {
      organizationId,
      status: "PUBLISHED",
      visibility: "PUBLIC",
    },
    orderBy: { publishedAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      subtitle: true,
      thumbnailUrl: true,
      level: true,
      price: true,
      currency: true,
    },
  });
}

export async function getPublicCourse(organizationId: string, courseSlug: string) {
  const course = await db.course.findFirst({
    where: {
      organizationId,
      slug: courseSlug,
      status: "PUBLISHED",
      visibility: { in: ["PUBLIC", "UNLISTED"] },
    },
    select: {
      id: true,
      title: true,
      subtitle: true,
      description: true,
      thumbnailUrl: true,
      coverUrl: true,
      level: true,
      price: true,
      currency: true,
    },
  });
  if (!course) return null;

  // Currículo (módulos + aulas), marcando aulas de prévia.
  const modules = await db.module.findMany({
    where: { courseId: course.id },
    orderBy: { orderIndex: "asc" },
    select: {
      id: true,
      title: true,
      lessons: {
        orderBy: { orderIndex: "asc" },
        select: { id: true, title: true, isPreview: true },
      },
    },
  });

  return { course, modules };
}
