import { db } from "@/lib/db";

/**
 * Serviço de Matrículas (SPEC §14.8). Escopado por organizationId.
 */

export function listEnrollments(organizationId: string) {
  return db.enrollment.findMany({
    where: { organizationId },
    orderBy: { enrolledAt: "desc" },
    include: {
      student: { select: { id: true, name: true, email: true } },
      course: { select: { id: true, title: true, status: true } },
    },
  });
}

export function listEnrollmentsForStudent(organizationId: string, studentId: string) {
  return db.enrollment.findMany({
    where: { organizationId, studentId },
    orderBy: { enrolledAt: "desc" },
    include: { course: { select: { id: true, title: true, status: true } } },
  });
}

export type EnrollResult =
  | { ok: true; enrollmentId: string }
  | { ok: false; error: string };

/**
 * Matrícula manual de um aluno em um curso.
 * Valida que tanto o aluno (membership STUDENT) quanto o curso pertencem à org.
 * Regra §11.2: curso arquivado não aceita novas matrículas.
 */
export async function enrollStudent(
  organizationId: string,
  studentId: string,
  courseId: string,
): Promise<EnrollResult> {
  const [member, course] = await Promise.all([
    db.organizationMember.findFirst({
      where: { organizationId, userId: studentId, role: "STUDENT" },
      select: { id: true },
    }),
    db.course.findFirst({
      where: { id: courseId, organizationId },
      select: { id: true, status: true },
    }),
  ]);

  if (!member) return { ok: false, error: "Aluno não encontrado nesta escola." };
  if (!course) return { ok: false, error: "Curso não encontrado." };
  if (course.status === "ARCHIVED") {
    return { ok: false, error: "Curso arquivado não aceita novas matrículas." };
  }

  const existing = await db.enrollment.findUnique({
    where: { courseId_studentId: { courseId, studentId } },
    select: { id: true },
  });
  if (existing) return { ok: false, error: "Aluno já matriculado neste curso." };

  const enrollment = await db.enrollment.create({
    data: { organizationId, courseId, studentId, status: "ACTIVE" },
  });
  return { ok: true, enrollmentId: enrollment.id };
}

/** Cancela uma matrícula (escopada por org). */
export async function cancelEnrollment(organizationId: string, enrollmentId: string) {
  const result = await db.enrollment.updateMany({
    where: { id: enrollmentId, organizationId },
    data: { status: "CANCELED" },
  });
  return result.count > 0;
}

export async function deleteEnrollment(organizationId: string, enrollmentId: string) {
  const result = await db.enrollment.deleteMany({
    where: { id: enrollmentId, organizationId },
  });
  return result.count > 0;
}
