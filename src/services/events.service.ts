import { db } from "@/lib/db";
import { notify } from "@/services/notification.service";
import { dispatchEvent } from "@/services/webhook.service";

/**
 * Eventos de domínio (Fase 5): centralizam o disparo de notificações (e-mail/
 * WhatsApp) e webhooks de saída quando algo relevante acontece. Best-effort —
 * envolto em try/catch pelos callers ou aqui, para nunca quebrar a ação
 * principal do usuário.
 */

const APP_URL = process.env.AUTH_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

/** Aluno matriculado: envia acesso e dispara webhook. */
export async function onEnrollmentCreated(
  organizationId: string,
  studentId: string,
  courseId: string,
): Promise<void> {
  try {
    const [student, course] = await Promise.all([
      db.user.findUnique({
        where: { id: studentId },
        select: { name: true, email: true, phone: true },
      }),
      db.course.findUnique({ where: { id: courseId }, select: { title: true } }),
    ]);
    if (!student || !course) return;

    await notify({
      organizationId,
      userId: studentId,
      template: "enrollment_access",
      subject: `Acesso liberado: ${course.title}`,
      text:
        `Olá, ${student.name}!\n\n` +
        `Você foi matriculado no curso "${course.title}".\n` +
        `Acesse sua área do aluno: ${APP_URL}/app\n`,
      email: student.email,
      phone: student.phone,
    });

    await dispatchEvent(organizationId, "enrollment.created", {
      studentId,
      courseId,
      courseTitle: course.title,
    });
  } catch {
    // best-effort
  }
}

/** Dono(s)/admin(s) da escola — destinatários das notificações internas. */
async function getSchoolOwners(organizationId: string) {
  return db.organizationMember.findMany({
    where: { organizationId, role: { in: ["ORG_OWNER", "ORG_ADMIN"] } },
    select: { userId: true, user: { select: { email: true } } },
  });
}

/**
 * Aluno se inscreveu por link e já tem acesso (inscrição aberta): avisa o(s)
 * dono(s) da escola que a pessoa começou o curso. Best-effort.
 */
export async function onEnrollmentStarted(
  organizationId: string,
  studentName: string,
  courseTitle: string,
): Promise<void> {
  try {
    const owners = await getSchoolOwners(organizationId);
    await Promise.all(
      owners.map((owner) =>
        notify({
          organizationId,
          userId: owner.userId,
          template: "enrollment_started",
          subject: `${studentName} começou o curso: ${courseTitle}`,
          text:
            `${studentName} se inscreveu e começou o curso "${courseTitle}".\n` +
            `Acompanhe o progresso em: ${APP_URL}/dashboard/enrollments\n`,
          email: owner.user.email,
        }),
      ),
    );
  } catch {
    // best-effort
  }
}

/**
 * Aluno concluiu todas as aulas obrigatórias de um curso: avisa o(s) dono(s)
 * da escola. Disparado apenas na transição para concluído. Best-effort.
 */
export async function onCourseCompleted(
  organizationId: string,
  studentName: string,
  courseTitle: string,
): Promise<void> {
  try {
    const owners = await getSchoolOwners(organizationId);
    await Promise.all(
      owners.map((owner) =>
        notify({
          organizationId,
          userId: owner.userId,
          template: "course_completed",
          subject: `🎓 ${studentName} concluiu o curso: ${courseTitle}`,
          text:
            `${studentName} concluiu o curso "${courseTitle}".\n` +
            `Veja os detalhes em: ${APP_URL}/dashboard/enrollments\n`,
          email: owner.user.email,
        }),
      ),
    );
  } catch {
    // best-effort
  }
}

/** Curso publicado: dispara webhook. */
export async function onCoursePublished(
  organizationId: string,
  courseId: string,
): Promise<void> {
  try {
    const course = await db.course.findUnique({
      where: { id: courseId },
      select: { title: true, slug: true },
    });
    if (!course) return;
    await dispatchEvent(organizationId, "course.published", {
      courseId,
      title: course.title,
      slug: course.slug,
    });
  } catch {
    // best-effort
  }
}

/** Certificado emitido: dispara webhook. */
export async function onCertificateIssued(
  organizationId: string,
  certificateId: string,
): Promise<void> {
  try {
    const cert = await db.certificate.findUnique({
      where: { id: certificateId },
      select: {
        certificateNumber: true,
        student: { select: { id: true, name: true } },
        course: { select: { title: true } },
      },
    });
    if (!cert) return;
    // NÃO incluir verificationCode no payload externo: é o segredo que valida a
    // autenticidade do certificado. O número público basta para o evento.
    await dispatchEvent(organizationId, "certificate.issued", {
      certificateNumber: cert.certificateNumber,
      studentId: cert.student.id,
      studentName: cert.student.name,
      courseTitle: cert.course.title,
    });
  } catch {
    // best-effort
  }
}

/** Aluno cadastrado: dispara webhook. */
export async function onStudentCreated(
  organizationId: string,
  studentId: string,
): Promise<void> {
  try {
    const student = await db.user.findUnique({
      where: { id: studentId },
      select: { name: true },
    });
    if (!student) return;
    await dispatchEvent(organizationId, "student.created", {
      studentId,
      name: student.name,
    });
  } catch {
    // best-effort
  }
}
