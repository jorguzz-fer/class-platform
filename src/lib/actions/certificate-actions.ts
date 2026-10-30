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
 * Marca/desmarca a presença presencial de um certificado (visão admin da
 * escola). Requer gestão de matrículas.
 */
export async function setCertificateAttendanceAction(
  certificateId: string,
  attended: boolean,
): Promise<{ error: string } | null> {
  const ctx = await requireOrg();
  assertPermission(ctx.role, "enrollment:manage");

  const ok = await setCertificateAttendance(ctx.organizationId, certificateId, attended);
  if (!ok) return { error: "Certificado não encontrado." };

  revalidatePath("/dashboard/certificates");
  return null;
}
