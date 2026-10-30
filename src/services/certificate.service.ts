import { randomBytes, randomUUID } from "node:crypto";

import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { onCertificateIssued } from "@/services/events.service";

/**
 * Serviço de Certificados (SPEC §10.5, §14.10).
 *
 * Regras:
 * - Certificado só para curso concluído (matrícula COMPLETED).
 * - Número e código de verificação únicos.
 * - Sem duplicar por curso/aluno (constraint @@unique([courseId, studentId]));
 *   reaproveita o existente se já houver.
 */

/** Gera um código de verificação curto e legível (hex maiúsculo). */
function generateVerificationCode(): string {
  return randomBytes(6).toString("hex").toUpperCase(); // 12 chars
}

/** Número do certificado: ano + uuid curto. */
function generateCertificateNumber(): string {
  const year = new Date().getFullYear();
  return `CERT-${year}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

export type IssueResult =
  | { ok: true; certificateId: string; alreadyIssued: boolean; organizationId: string }
  | { ok: false; error: string };

/**
 * Emite (ou recupera) o certificado do aluno logado para um curso.
 * O studentId vem da sessão — não confiar no cliente.
 */
export async function issueCertificate(
  studentId: string,
  courseId: string,
): Promise<IssueResult> {
  // Matrícula concluída nesta org/curso?
  const enrollment = await db.enrollment.findFirst({
    where: { studentId, courseId, status: "COMPLETED" },
    select: { organizationId: true },
  });
  if (!enrollment) {
    return { ok: false, error: "Conclua todas as aulas obrigatórias para emitir o certificado." };
  }

  const existing = await db.certificate.findUnique({
    where: { courseId_studentId: { courseId, studentId } },
    select: { id: true },
  });
  if (existing) {
    return {
      ok: true,
      certificateId: existing.id,
      alreadyIssued: true,
      organizationId: enrollment.organizationId,
    };
  }

  try {
    const certificate = await db.certificate.create({
      data: {
        organizationId: enrollment.organizationId,
        courseId,
        studentId,
        certificateNumber: generateCertificateNumber(),
        verificationCode: generateVerificationCode(),
      },
    });
    return {
      ok: true,
      certificateId: certificate.id,
      alreadyIssued: false,
      organizationId: enrollment.organizationId,
    };
  } catch (e) {
    // Emissão simultânea (ex.: automática + clique do aluno): a constraint
    // única (curso, aluno) barra a segunda — devolve a que já foi criada.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const winner = await db.certificate.findUnique({
        where: { courseId_studentId: { courseId, studentId } },
        select: { id: true },
      });
      if (winner) {
        return {
          ok: true,
          certificateId: winner.id,
          alreadyIssued: true,
          organizationId: enrollment.organizationId,
        };
      }
    }
    throw e;
  }
}

/**
 * Emissão automática quando a matrícula fica COMPLETED (aluno concluiu as
 * aulas ou o admin marcou como concluída). Idempotente e best-effort: nunca
 * lança, para não atrapalhar a conclusão do curso. Webhook só em emissão nova.
 */
export async function autoIssueCertificate(studentId: string, courseId: string): Promise<void> {
  try {
    const result = await issueCertificate(studentId, courseId);
    if (result.ok && !result.alreadyIssued) {
      await onCertificateIssued(result.organizationId, result.certificateId);
    }
  } catch {
    // best-effort: o admin ainda pode emitir pela tela de Matrículas.
  }
}

/** Emissão pelo admin a partir de uma matrícula concluída (escopada por org). */
export async function issueCertificateForEnrollment(
  organizationId: string,
  enrollmentId: string,
): Promise<IssueResult> {
  const enrollment = await db.enrollment.findFirst({
    where: { id: enrollmentId, organizationId },
    select: { studentId: true, courseId: true, status: true },
  });
  if (!enrollment) return { ok: false, error: "Matrícula não encontrada." };
  if (enrollment.status !== "COMPLETED") {
    return {
      ok: false,
      error: "A matrícula precisa estar Concluída. Altere o status em Editar.",
    };
  }

  const result = await issueCertificate(enrollment.studentId, enrollment.courseId);
  if (result.ok && !result.alreadyIssued) {
    await onCertificateIssued(organizationId, result.certificateId);
  }
  return result;
}

/** Matrículas concluídas da escola que ainda não têm certificado. */
export async function listPendingCertificateEnrollments(organizationId: string) {
  const [completed, certificates] = await Promise.all([
    db.enrollment.findMany({
      where: { organizationId, status: "COMPLETED" },
      select: { id: true, studentId: true, courseId: true },
    }),
    db.certificate.findMany({
      where: { organizationId },
      select: { studentId: true, courseId: true },
    }),
  ]);
  const issued = new Set(certificates.map((c) => `${c.courseId}:${c.studentId}`));
  return completed.filter((e) => !issued.has(`${e.courseId}:${e.studentId}`));
}

/** Emite de uma vez os certificados de todas as matrículas concluídas pendentes. */
export async function issuePendingCertificates(
  organizationId: string,
): Promise<{ issued: number; failed: number }> {
  const pending = await listPendingCertificateEnrollments(organizationId);
  let issued = 0;
  let failed = 0;
  for (const e of pending) {
    try {
      const result = await issueCertificate(e.studentId, e.courseId);
      if (result.ok && !result.alreadyIssued) {
        issued++;
        await onCertificateIssued(organizationId, result.certificateId);
      } else if (!result.ok) {
        failed++;
      }
    } catch {
      failed++;
    }
  }
  return { issued, failed };
}

/** Lista os certificados do aluno logado. */
export function listStudentCertificates(studentId: string) {
  return db.certificate.findMany({
    where: { studentId },
    orderBy: { issuedAt: "desc" },
    include: { course: { select: { id: true, title: true } } },
  });
}

/** Certificado do aluno por id (escopo: o próprio aluno). */
export function getStudentCertificate(studentId: string, certificateId: string) {
  return db.certificate.findFirst({
    where: { id: certificateId, studentId },
    include: {
      course: { select: { title: true, workloadHours: true, durationMinutes: true } },
      student: { select: { name: true } },
      organization: { select: { name: true } },
    },
  });
}

/**
 * Carga horária (horas) a exibir no certificado: usa `workloadHours` se
 * definido; senão estima pela soma da duração das aulas (durationMinutes).
 * Retorna null quando não há base para informar.
 */
export function certificateWorkloadHours(course: {
  workloadHours: number | null;
  durationMinutes: number | null;
}): number | null {
  if (course.workloadHours && course.workloadHours > 0) return course.workloadHours;
  if (course.durationMinutes && course.durationMinutes > 0) {
    return Math.max(1, Math.round(course.durationMinutes / 60));
  }
  return null;
}

/**
 * Verificação pública por código (SPEC §14.10 GET /verify/:code).
 * Retorna apenas dados não sensíveis para validar a autenticidade.
 */
export async function verifyCertificate(code: string) {
  const certificate = await db.certificate.findUnique({
    where: { verificationCode: code },
    include: {
      course: { select: { title: true } },
      student: { select: { name: true } },
      organization: { select: { name: true } },
    },
  });
  if (!certificate) return null;

  return {
    certificateNumber: certificate.certificateNumber,
    issuedAt: certificate.issuedAt,
    studentName: certificate.student.name,
    courseTitle: certificate.course.title,
    schoolName: certificate.organization.name,
  };
}

export type CertificateFilters = {
  q?: string;
  courseId?: string;
  from?: string;
  to?: string;
  attended?: string;
  /** Operação do aluno nesta escola (Configurações → Operações). */
  operation?: string;
};

/** Certificados emitidos numa organização (visão admin), com filtros. */
export function listOrgCertificates(
  organizationId: string,
  filters?: CertificateFilters,
) {
  return db.certificate.findMany({
    where: buildCertificateWhere(organizationId, filters),
    orderBy: { issuedAt: "desc" },
    include: {
      course: { select: { id: true, title: true } },
      student: {
        select: {
          name: true,
          email: true,
          cpf: true,
          // Operação do aluno NESTA escola (vínculo da organização).
          memberships: { where: { organizationId }, select: { operation: true } },
        },
      },
    },
  });
}

/**
 * Monta o filtro das listagens/exportação de certificados. Compartilhado entre
 * a tela e o CSV para manter o mesmo escopo.
 * - q: nome/e-mail do aluno ou título do curso
 * - courseId: curso específico
 * - from/to: intervalo da data de emissão (YYYY-MM-DD, inclusivo)
 * - attended: "yes" (presencial) | "no" (não presencial)
 */
export function buildCertificateWhere(
  organizationId: string,
  filters?: CertificateFilters,
) {
  const q = filters?.q?.trim();
  const insensitive = { mode: "insensitive" as const };

  const issuedAt: { gte?: Date; lte?: Date } = {};
  if (filters?.from && /^\d{4}-\d{2}-\d{2}$/.test(filters.from)) {
    issuedAt.gte = new Date(`${filters.from}T00:00:00.000Z`);
  }
  if (filters?.to && /^\d{4}-\d{2}-\d{2}$/.test(filters.to)) {
    issuedAt.lte = new Date(`${filters.to}T23:59:59.999Z`);
  }

  const attended =
    filters?.attended === "yes" ? true : filters?.attended === "no" ? false : undefined;

  return {
    organizationId,
    ...(filters?.courseId ? { courseId: filters.courseId } : {}),
    ...(attended !== undefined ? { attendedInPerson: attended } : {}),
    ...(filters?.operation
      ? {
          student: {
            memberships: { some: { organizationId, operation: filters.operation } },
          },
        }
      : {}),
    ...(issuedAt.gte || issuedAt.lte ? { issuedAt } : {}),
    ...(q
      ? {
          OR: [
            { student: { name: { contains: q, ...insensitive } } },
            { student: { email: { contains: q, ...insensitive } } },
            { course: { title: { contains: q, ...insensitive } } },
          ],
        }
      : {}),
  };
}

/** Cursos que já têm certificados emitidos (para o filtro por curso). */
export function listCertificateCourses(organizationId: string) {
  return db.course.findMany({
    where: { organizationId, certificates: { some: {} } },
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });
}

/** Altera a data de emissão de um certificado (correção manual). Escopado por org. */
export async function setCertificateIssuedAt(
  organizationId: string,
  certificateId: string,
  issuedAt: Date,
): Promise<boolean> {
  const result = await db.certificate.updateMany({
    where: { id: certificateId, organizationId },
    data: { issuedAt },
  });
  return result.count > 0;
}

/**
 * Marca, altera ou remove a presença no treinamento presencial. A data é
 * escolhida por quem marca (a tela sugere a data de emissão). `null` remove a
 * presença. Escopado por org.
 */
export async function setCertificateAttendance(
  organizationId: string,
  certificateId: string,
  attendedAt: Date | null,
): Promise<boolean> {
  const result = await db.certificate.updateMany({
    where: { id: certificateId, organizationId },
    data: { attendedInPerson: attendedAt !== null, attendedAt },
  });
  return result.count > 0;
}
