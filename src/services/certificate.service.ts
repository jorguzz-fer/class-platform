import { randomBytes, randomUUID } from "node:crypto";

import { db } from "@/lib/db";

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
  | { ok: true; certificateId: string; alreadyIssued: boolean }
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
    return { ok: true, certificateId: existing.id, alreadyIssued: true };
  }

  const certificate = await db.certificate.create({
    data: {
      organizationId: enrollment.organizationId,
      courseId,
      studentId,
      certificateNumber: generateCertificateNumber(),
      verificationCode: generateVerificationCode(),
    },
  });
  return { ok: true, certificateId: certificate.id, alreadyIssued: false };
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

/** Certificados emitidos numa organização (visão admin), com filtros. */
export function listOrgCertificates(
  organizationId: string,
  filters?: { q?: string; courseId?: string; from?: string; to?: string; attended?: string },
) {
  return db.certificate.findMany({
    where: buildCertificateWhere(organizationId, filters),
    orderBy: { issuedAt: "desc" },
    include: {
      course: { select: { id: true, title: true } },
      student: { select: { name: true, email: true, cpf: true } },
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
  filters?: { q?: string; courseId?: string; from?: string; to?: string; attended?: string },
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
