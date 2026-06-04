"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireOrg } from "@/lib/tenant";
import { issueCertificate } from "@/services/certificate.service";
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
