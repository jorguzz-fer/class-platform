import Link from "next/link";
import { CheckCircle2, XCircle, GraduationCap } from "lucide-react";

import { verifyCertificate } from "@/services/certificate.service";
import { Card, CardContent } from "@/components/ui/card";

export default async function VerifyCertificatePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const result = await verifyCertificate(code);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-6 flex items-center justify-center gap-2 font-semibold"
        >
          <GraduationCap className="h-6 w-6" />
          <span>ClassOS</span>
        </Link>
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            {result ? (
              <>
                <CheckCircle2 className="h-12 w-12 text-primary" />
                <p className="text-lg font-semibold">Certificado válido</p>
                <div className="flex flex-col gap-1 text-sm">
                  <p>
                    <span className="text-muted-foreground">Aluno: </span>
                    {result.studentName}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Curso: </span>
                    {result.courseTitle}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Escola: </span>
                    {result.schoolName}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Número: </span>
                    {result.certificateNumber}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Emitido em: </span>
                    {result.issuedAt.toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </>
            ) : (
              <>
                <XCircle className="h-12 w-12 text-destructive" />
                <p className="text-lg font-semibold">Certificado não encontrado</p>
                <p className="text-sm text-muted-foreground">
                  O código informado não corresponde a nenhum certificado válido.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
