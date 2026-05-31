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
      course: { select: { title: true } },
      student: { select: { name: true } },
      organization: { select: { name: true } },
    },
  });
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

/** Certificados emitidos numa organização (visão admin). */
export function listOrgCertificates(organizationId: string) {
  return db.certificate.findMany({
    where: { organizationId },
    orderBy: { issuedAt: "desc" },
    include: {
      course: { select: { title: true } },
      student: { select: { name: true, email: true } },
    },
  });
}
