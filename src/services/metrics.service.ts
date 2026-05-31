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
