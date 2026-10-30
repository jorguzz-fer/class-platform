"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireOrg } from "@/lib/tenant";
import { assertPermission } from "@/lib/permissions";
import {
  issueCertificate,
  setCertificateAttendance,
  setCertificateIssuedAt,
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
    attendedAt = parseDateOnly(date);
    if (!attendedAt) return { error: "Data inválida." };
  }

  const ok = await setCertificateAttendance(ctx.organizationId, certificateId, attendedAt);
  if (!ok) return { error: "Certificado não encontrado." };

  revalidatePath("/dashboard/certificates");
  return null;
}

/**
 * Altera a data de emissão de um certificado (visão admin da escola). A nova
 * data passa a valer em tudo: tela do aluno, PDF e verificação pública.
 * Requer gestão de matrículas.
 */
export async function setCertificateIssuedAtAction(
  certificateId: string,
  date: string,
): Promise<{ error: string } | null> {
  const ctx = await requireOrg();
  assertPermission(ctx.role, "enrollment:manage");

  const issuedAt = parseDateOnly(date);
  if (!issuedAt) return { error: "Data inválida." };

  const ok = await setCertificateIssuedAt(ctx.organizationId, certificateId, issuedAt);
  if (!ok) return { error: "Certificado não encontrado." };

  revalidatePath("/dashboard/certificates");
  return null;
}

/**
 * Converte YYYY-MM-DD (do <input type=date>) em Date ao meio-dia UTC, para a
 * data não "voltar um dia" ao exibir em outro fuso. null se inválida.
 */
function parseDateOnly(date: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const d = new Date(`${date}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== date) return null;
  return d;
}
