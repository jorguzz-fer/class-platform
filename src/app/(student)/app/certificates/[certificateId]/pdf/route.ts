import { requireOrg } from "@/lib/tenant";
import {
  getStudentCertificate,
  certificateWorkloadHours,
} from "@/services/certificate.service";
import { buildCertificatePdf } from "@/lib/certificate-pdf";

export const dynamic = "force-dynamic";

/** Remove acentos e caracteres não-ASCII para um nome de arquivo seguro. */
function slugForFile(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 60);
}

/** Download do certificado em PDF (escopo: o próprio aluno). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ certificateId: string }> },
) {
  const { certificateId } = await params;
  const ctx = await requireOrg();

  const cert = await getStudentCertificate(ctx.userId, certificateId);
  if (!cert) {
    return new Response("Certificado não encontrado.", { status: 404 });
  }

  const appUrl = (process.env.AUTH_URL ?? "").replace(/\/$/, "");
  const verifyUrl = appUrl ? `${appUrl}/verify/${cert.verificationCode}` : null;

  const pdf = await buildCertificatePdf({
    studentName: cert.student.name,
    courseTitle: cert.course.title,
    schoolName: cert.organization.name,
    issuedAt: cert.issuedAt,
    workloadHours: certificateWorkloadHours(cert.course),
    certificateNumber: cert.certificateNumber,
    verificationCode: cert.verificationCode,
    verifyUrl,
  });

  const safeName = slugForFile(cert.course.title);

  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="certificado-${safeName || "curso"}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
