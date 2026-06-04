import { randomUUID } from "node:crypto";

import { db } from "@/lib/db";

/**
 * Serviço de privacidade / direitos do titular (LGPD).
 *
 * - exportUserData: portabilidade — todos os dados pessoais do usuário em JSON.
 * - anonymizeStudent: direito ao esquecimento — remove PII preservando a
 *   integridade histórica (matrículas, progresso, certificados continuam, mas
 *   sem identificar a pessoa).
 */

/** Reúne os dados pessoais do usuário para exportação (portabilidade). */
export async function exportUserData(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      avatarUrl: true,
      role: true,
      isActive: true,
      createdAt: true,
      lastLoginAt: true,
      memberships: {
        select: { organizationId: true, role: true, createdAt: true },
      },
      enrollments: {
        select: {
          status: true,
          enrolledAt: true,
          completedAt: true,
          course: { select: { title: true } },
        },
      },
      progress: {
        select: {
          status: true,
          progressPercentage: true,
          updatedAt: true,
          lesson: { select: { title: true } },
        },
      },
      certificates: {
        select: {
          certificateNumber: true,
          issuedAt: true,
          course: { select: { title: true } },
        },
      },
      consents: {
        select: { type: true, version: true, grantedAt: true },
      },
    },
  });
  if (!user) return null;

  return {
    exportedAt: new Date().toISOString(),
    subject: "dados pessoais do titular (LGPD)",
    user,
  };
}

/**
 * Anonimiza um aluno de uma organização (direito ao esquecimento).
 * Mantém os registros históricos, mas substitui a PID por valores anônimos.
 *
 * Escopo: o aluno deve ser membro STUDENT da organização (autorização do admin).
 * O User é global; só anonimizamos se ele não tiver outros vínculos ativos —
 * caso contrário, apenas removemos a membership/matrículas desta org.
 */
export type AnonymizeResult =
  | { ok: true; anonymized: boolean }
  | { ok: false; error: string };

export async function anonymizeStudent(
  organizationId: string,
  studentId: string,
): Promise<AnonymizeResult> {
  const member = await db.organizationMember.findFirst({
    where: { organizationId, userId: studentId, role: "STUDENT" },
    select: { id: true },
  });
  if (!member) return { ok: false, error: "Aluno não encontrado nesta escola." };

  // Vínculos com OUTRAS organizações?
  const otherMemberships = await db.organizationMember.count({
    where: { userId: studentId, organizationId: { not: organizationId } },
  });

  if (otherMemberships > 0) {
    // O usuário pertence a outras escolas: não anonimiza o User global, apenas
    // desvincula desta org (remove membership + matrículas + logs desta org).
    await db.$transaction([
      db.enrollment.deleteMany({ where: { organizationId, studentId } }),
      db.notificationLog.deleteMany({ where: { organizationId, userId: studentId } }),
      db.organizationMember.delete({ where: { id: member.id } }),
    ]);
    return { ok: true, anonymized: false };
  }

  // Sem outros vínculos: anonimiza o User global preservando o histórico.
  const anonEmail = `anon-${randomUUID()}@anonimizado.local`;
  await db.$transaction([
    db.organizationMember.delete({ where: { id: member.id } }),
    db.passwordResetToken.deleteMany({ where: { userId: studentId } }),
    // Purga o destino (email/telefone em claro) dos logs de notificação desta
    // org — sem isso o titular continuaria reidentificável pelo rastro.
    db.notificationLog.deleteMany({ where: { organizationId, userId: studentId } }),
    // Anonimiza (não apaga) o consentimento: preserva a evidência de aceite
    // (tipo/versão/data) para accountability, removendo a ligação direta ao IP.
    db.consentRecord.updateMany({
      where: { userId: studentId },
      data: { ipAddress: null },
    }),
    db.user.update({
      where: { id: studentId },
      data: {
        name: "Aluno anônimo",
        email: anonEmail,
        phone: null,
        passwordHash: null,
        avatarUrl: null,
        isActive: false,
        anonymizedAt: new Date(),
      },
    }),
  ]);

  return { ok: true, anonymized: true };
}
