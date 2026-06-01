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
        verificationCode: true,
        student: { select: { id: true, name: true } },
        course: { select: { title: true } },
      },
    });
    if (!cert) return;
    await dispatchEvent(organizationId, "certificate.issued", {
      certificateNumber: cert.certificateNumber,
      verificationCode: cert.verificationCode,
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
