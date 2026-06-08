import { db } from "@/lib/db";

/**
 * Serviço de Matrículas (SPEC §14.8). Escopado por organizationId.
 */

export function listEnrollments(organizationId: string) {
  return db.enrollment.findMany({
    // PENDING aparece na seção de solicitações, não na lista geral.
    where: { organizationId, status: { not: "PENDING" } },
    orderBy: { enrolledAt: "desc" },
    include: {
      student: { select: { id: true, name: true, email: true } },
      course: { select: { id: true, title: true, status: true } },
    },
  });
}

/** Solicitações de inscrição aguardando aprovação do dono da escola. */
export function listPendingEnrollments(organizationId: string) {
  return db.enrollment.findMany({
    where: { organizationId, status: "PENDING" },
    orderBy: { enrolledAt: "asc" },
    include: {
      student: { select: { id: true, name: true, email: true } },
      course: { select: { id: true, title: true } },
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

export type ApproveResult =
  | { ok: true; studentId: string; courseId: string }
  | { ok: false; error: string };

/**
 * Aprova uma solicitação de inscrição (PENDING → ACTIVE), liberando o acesso.
 * Carimba enrolledAt no momento da aprovação. Escopado por org. Idempotência:
 * só age sobre matrículas PENDING. Retorna ids para notificar o aluno.
 */
export async function approveEnrollment(
  organizationId: string,
  enrollmentId: string,
): Promise<ApproveResult> {
  const enrollment = await db.enrollment.findFirst({
    where: { id: enrollmentId, organizationId, status: "PENDING" },
    select: { id: true, studentId: true, courseId: true },
  });
  if (!enrollment) return { ok: false, error: "Solicitação não encontrada." };

  await db.enrollment.update({
    where: { id: enrollment.id },
    data: { status: "ACTIVE", enrolledAt: new Date() },
  });

  return { ok: true, studentId: enrollment.studentId, courseId: enrollment.courseId };
}

/** Recusa uma solicitação pendente: remove a matrícula. Escopado por org. */
export async function rejectEnrollment(organizationId: string, enrollmentId: string) {
  const result = await db.enrollment.deleteMany({
    where: { id: enrollmentId, organizationId, status: "PENDING" },
  });
  return result.count > 0;
}
