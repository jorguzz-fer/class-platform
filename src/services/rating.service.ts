import { db } from "@/lib/db";

/**
 * Avaliações por estrelas (1–5) de cursos e aulas, feitas pelo aluno.
 * Um aluno tem no máximo uma nota por curso e uma por aula (upsert).
 * Só avalia quem tem acesso (matrícula ativa/concluída).
 */

const ACCESSIBLE = ["ACTIVE", "COMPLETED"] as const;

export type RateResult = { ok: true } | { ok: false; error: string };

/** Avalia (ou atualiza a nota de) um curso. Exige matrícula do aluno. */
export async function rateCourse(
  organizationId: string,
  studentId: string,
  courseId: string,
  stars: number,
): Promise<RateResult> {
  const enrolled = await db.enrollment.findFirst({
    where: { studentId, courseId, status: { in: [...ACCESSIBLE] } },
    select: { id: true },
  });
  if (!enrolled) return { ok: false, error: "Você não está matriculado neste curso." };

  await db.courseRating.upsert({
    where: { courseId_studentId: { courseId, studentId } },
    update: { stars },
    create: { organizationId, courseId, studentId, stars },
  });
  return { ok: true };
}

/** Avalia (ou atualiza a nota de) uma aula. Exige acesso à aula. */
export async function rateLesson(
  organizationId: string,
  studentId: string,
  lessonId: string,
  stars: number,
): Promise<RateResult> {
  const lesson = await db.lesson.findFirst({
    where: {
      id: lessonId,
      organizationId,
      course: {
        enrollments: { some: { studentId, status: { in: [...ACCESSIBLE] } } },
      },
    },
    select: { id: true },
  });
  if (!lesson) return { ok: false, error: "Aula não disponível." };

  await db.lessonRating.upsert({
    where: { lessonId_studentId: { lessonId, studentId } },
    update: { stars },
    create: { organizationId, lessonId, studentId, stars },
  });
  return { ok: true };
}

export async function getStudentCourseRating(studentId: string, courseId: string) {
  const r = await db.courseRating.findUnique({
    where: { courseId_studentId: { courseId, studentId } },
    select: { stars: true },
  });
  return r?.stars ?? null;
}

export async function getStudentLessonRating(studentId: string, lessonId: string) {
  const r = await db.lessonRating.findUnique({
    where: { lessonId_studentId: { lessonId, studentId } },
    select: { stars: true },
  });
  return r?.stars ?? null;
}

/** Média e quantidade de avaliações de um curso. */
export async function getCourseRatingSummary(courseId: string) {
  const agg = await db.courseRating.aggregate({
    where: { courseId },
    _avg: { stars: true },
    _count: { _all: true },
  });
  return {
    average: agg._avg.stars ? Math.round(agg._avg.stars * 10) / 10 : null,
    count: agg._count._all,
  };
}

/** Médias de avaliação por curso da org (para a tabela de relatórios). */
export async function getCourseRatingsByOrg(organizationId: string) {
  const grouped = await db.courseRating.groupBy({
    by: ["courseId"],
    where: { organizationId },
    _avg: { stars: true },
    _count: { _all: true },
  });
  return new Map(
    grouped.map((g) => [
      g.courseId,
      {
        average: g._avg.stars ? Math.round(g._avg.stars * 10) / 10 : null,
        count: g._count._all,
      },
    ]),
  );
}
