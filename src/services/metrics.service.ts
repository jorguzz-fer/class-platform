import { db } from "@/lib/db";

/**
 * Métricas do dashboard da escola (SPEC §12.1). Tudo escopado por organizationId.
 */
export async function getSchoolMetrics(organizationId: string) {
  const where = { organizationId };
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalStudents,
    totalCourses,
    publishedCourses,
    activeEnrollments,
    completedEnrollments,
    totalEnrollments,
    certificatesIssued,
    activeStudents7d,
  ] = await Promise.all([
    db.organizationMember.count({ where: { ...where, role: "STUDENT" } }),
    db.course.count({ where }),
    db.course.count({ where: { ...where, status: "PUBLISHED" } }),
    db.enrollment.count({ where: { ...where, status: "ACTIVE" } }),
    db.enrollment.count({ where: { ...where, status: "COMPLETED" } }),
    db.enrollment.count({ where }),
    db.certificate.count({ where }),
    // Alunos ativos = com progresso de aula atualizado nos últimos 7 dias.
    db.lessonProgress
      .findMany({
        where: { ...where, updatedAt: { gte: sevenDaysAgo } },
        select: { studentId: true },
        distinct: ["studentId"],
      })
      .then((rows) => rows.length),
  ]);

  const completionRate =
    totalEnrollments > 0
      ? Math.round((completedEnrollments / totalEnrollments) * 100)
      : 0;

  return {
    totalStudents,
    totalCourses,
    publishedCourses,
    activeEnrollments,
    completedEnrollments,
    totalEnrollments,
    certificatesIssued,
    activeStudents7d,
    completionRate,
  };
}

/** Cursos mais recentes com contagem de matrículas (para a tabela do dashboard). */
export function getRecentCourses(organizationId: string, take = 5) {
  return db.course.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      title: true,
      status: true,
      _count: { select: { enrollments: true } },
    },
  });
}

/** Distribuição de matrículas por status (para os cartões de relatório). */
export async function getEnrollmentBreakdown(organizationId: string) {
  const grouped = await db.enrollment.groupBy({
    by: ["status"],
    where: { organizationId },
    _count: { _all: true },
  });
  const count = (status: string) =>
    grouped.find((g) => g.status === status)?._count._all ?? 0;

  return {
    pending: count("PENDING"),
    active: count("ACTIVE"),
    completed: count("COMPLETED"),
    canceled: count("CANCELED"),
    expired: count("EXPIRED"),
  };
}

/**
 * Desempenho por curso: conteúdo e matrículas por status, com taxa de
 * conclusão. Faz 2 queries (cursos + groupBy) e cruza em memória, sem N+1.
 */
export async function getCourseReport(organizationId: string) {
  const [courses, grouped] = await Promise.all([
    db.course.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        status: true,
        _count: { select: { modules: true, lessons: true } },
      },
    }),
    db.enrollment.groupBy({
      by: ["courseId", "status"],
      where: { organizationId },
      _count: { _all: true },
    }),
  ]);

  return courses.map((course) => {
    const rows = grouped.filter((g) => g.courseId === course.id);
    const by = (status: string) =>
      rows.find((g) => g.status === status)?._count._all ?? 0;
    const completed = by("COMPLETED");
    const total = rows.reduce((sum, g) => sum + g._count._all, 0);

    return {
      id: course.id,
      title: course.title,
      status: course.status,
      modules: course._count.modules,
      lessons: course._count.lessons,
      total,
      active: by("ACTIVE"),
      completed,
      pending: by("PENDING"),
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  });
}
