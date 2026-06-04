import Link from "next/link";
import { Award } from "lucide-react";

import { requireOrg } from "@/lib/tenant";
import { listStudentCertificates } from "@/services/certificate.service";
import { Card, CardContent } from "@/components/ui/card";

export default async function StudentCertificatesPage() {
  const ctx = await requireOrg();
  const certificates = await listStudentCertificates(ctx.userId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Meus certificados</h1>
        <p className="text-muted-foreground">
          Certificados de cursos concluídos.
        </p>
      </div>

      {certificates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Award className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">Nenhum certificado ainda</p>
            <p className="text-sm text-muted-foreground">
              Conclua um curso para emitir seu certificado.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {certificates.map((cert) => (
            <Link key={cert.id} href={`/app/certificates/${cert.id}`}>
              <Card className="h-full transition-colors hover:border-primary">
                <CardContent className="flex items-center gap-4 py-6">
                  <Award className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-medium">{cert.course.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {cert.certificateNumber} •{" "}
                      {cert.issuedAt.toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
