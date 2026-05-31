import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Award } from "lucide-react";

import { requireOrg } from "@/lib/tenant";
import { getStudentCertificate } from "@/services/certificate.service";
import { Card, CardContent } from "@/components/ui/card";

export default async function CertificateDetailPage({
  params,
}: {
  params: Promise<{ certificateId: string }>;
}) {
  const { certificateId } = await params;
  const ctx = await requireOrg();

  const cert = await getStudentCertificate(ctx.userId, certificateId);
  if (!cert) notFound();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Link
        href="/app/certificates"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Meus certificados
      </Link>

      {/* Certificado (visual simples; PDF fica para o pós-MVP, SPEC §10.5). */}
      <Card className="border-2">
        <CardContent className="flex flex-col items-center gap-4 px-8 py-12 text-center">
          <Award className="h-12 w-12 text-primary" />
          <p className="text-sm uppercase tracking-widest text-muted-foreground">
            Certificado de Conclusão
          </p>
          <p className="text-lg">Certificamos que</p>
          <p className="text-2xl font-bold">{cert.student.name}</p>
          <p className="text-lg">concluiu o curso</p>
          <p className="text-xl font-semibold">{cert.course.title}</p>
          <p className="text-sm text-muted-foreground">
            Emitido por {cert.organization.name} em{" "}
            {cert.issuedAt.toLocaleDateString("pt-BR")}
          </p>

          <div className="mt-4 flex flex-col items-center gap-1 border-t pt-4 text-xs text-muted-foreground">
            <p>Número: {cert.certificateNumber}</p>
            <p>
              Código de verificação:{" "}
              <span className="font-mono font-medium">{cert.verificationCode}</span>
            </p>
            <p>
              Verifique em /verify/{cert.verificationCode}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
