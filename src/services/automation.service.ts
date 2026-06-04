import { db } from "@/lib/db";
import { notify } from "@/services/notification.service";

/**
 * Automações comportamentais (Fase 5): recuperação de alunos inativos.
 * Escopo por organizationId.
 *
 * "Inativo" = aluno com matrícula ATIVA cujo último progresso de aula é mais
 * antigo que `inactiveDays` (ou que nunca registrou progresso).
 */
export async function findInactiveStudents(
  organizationId: string,
  inactiveDays = 7,
) {
  const cutoff = new Date(Date.now() - inactiveDays * 24 * 60 * 60 * 1000);

  // Alunos com matrícula ativa na org.
  const enrollments = await db.enrollment.findMany({
    where: { organizationId, status: "ACTIVE" },
    select: {
      studentId: true,
      student: { select: { name: true, email: true, phone: true } },
    },
    distinct: ["studentId"],
  });

  const inactive: {
    studentId: string;
    name: string;
    email: string;
    phone: string | null;
  }[] = [];

  for (const e of enrollments) {
    const recent = await db.lessonProgress.findFirst({
      where: { organizationId, studentId: e.studentId, updatedAt: { gte: cutoff } },
      select: { id: true },
    });
    if (!recent) {
      inactive.push({
        studentId: e.studentId,
        name: e.student.name,
        email: e.student.email,
        phone: e.student.phone,
      });
    }
  }
  return inactive;
}

/**
 * Dispara a notificação de recuperação para os alunos inativos.
 * Retorna quantos foram notificados.
 */
export async function recoverInactiveStudents(
  organizationId: string,
  inactiveDays = 7,
): Promise<number> {
  const inactive = await findInactiveStudents(organizationId, inactiveDays);

  for (const student of inactive) {
    await notify({
      organizationId,
      userId: student.studentId,
      template: "inactive_recovery",
      subject: "Sentimos sua falta! 👋",
      text:
        `Olá, ${student.name}!\n\n` +
        `Notamos que faz um tempo desde seu último acesso. ` +
        `Que tal continuar de onde parou? Seus cursos estão te esperando.`,
      email: student.email,
      phone: student.phone,
    });
  }
  return inactive.length;
}
