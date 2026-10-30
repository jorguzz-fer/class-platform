"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireOrg } from "@/lib/tenant";
import { assertPermission } from "@/lib/permissions";
import {
  issueCertificate,
  setCertificateAttendance,
} from "@/services/certificate.service";
import { onCertificateIssued } from "@/services/events.service";

/**
 * Emite o certificado do aluno logado para um curso e redireciona para ele.
 * Escopo = usuário da sessão.
 */
export async function issueCertificateAction(courseId: string): Promise<{ error: string } | void> {
  const ctx = await requireOrg();
  const result = await issueCertificate(ctx.userId, courseId);
  if (!result.ok) return { error: result.error };

  // Dispara webhook apenas em emissão nova (não em re-acesso ao existente).
  if (!result.alreadyIssued) {
    await onCertificateIssued(ctx.organizationId, result.certificateId);
  }

  revalidatePath("/app/certificates");
  redirect(`/app/certificates/${result.certificateId}`);
}

/**
 * Marca, altera ou remove a presença presencial de um certificado (visão admin
 * da escola). `date` vem como YYYY-MM-DD do seletor; `null` remove a presença.
 * Requer gestão de matrículas.
 */
export async function setCertificateAttendanceAction(
  certificateId: string,
  date: string | null,
): Promise<{ error: string } | null> {
  const ctx = await requireOrg();
  assertPermission(ctx.role, "enrollment:manage");

  let attendedAt: Date | null = null;
  if (date !== null) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Data inválida." };
    // Meio-dia UTC: a data não "volta um dia" ao exibir em outro fuso.
    attendedAt = new Date(`${date}T12:00:00.000Z`);
    if (Number.isNaN(attendedAt.getTime()) || attendedAt.toISOString().slice(0, 10) !== date) {
      return { error: "Data inválida." };
    }
  }

  const ok = await setCertificateAttendance(ctx.organizationId, certificateId, attendedAt);
  if (!ok) return { error: "Certificado não encontrado." };

  revalidatePath("/dashboard/certificates");
  return null;
}
