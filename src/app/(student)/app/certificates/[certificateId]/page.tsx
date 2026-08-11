import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";

import { requireOrg } from "@/lib/tenant";
import {
  getStudentCertificate,
  certificateWorkloadHours,
} from "@/services/certificate.service";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function CertificateDetailPage({
  params,
}: {
  params: Promise<{ certificateId: string }>;
}) {
  const { certificateId } = await params;
  const ctx = await requireOrg();

  const cert = await getStudentCertificate(ctx.userId, certificateId);
  if (!cert) notFound();

  const workload = certificateWorkloadHours(cert.course);
  const dateStr = cert.issuedAt.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <Link
          href="/app/certificates"
          className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Meus certificados
        </Link>
        <a
          href={`/app/certificates/${cert.id}/pdf`}
          className={cn(buttonVariants({ size: "sm" }), "gap-1")}
        >
          <Download className="h-4 w-4" />
          Baixar PDF
        </a>
      </div>

      {/* Certificado — layout padrão elegante (espelha o PDF). */}
      <div className="overflow-hidden rounded-lg border-2 border-[#17224a] bg-white shadow-sm">
        <div className="m-2 border border-[#b78d30]">
          <div className="flex flex-col items-center gap-5 px-6 py-12 text-center sm:px-12">
            <div className="flex flex-col items-center gap-1">
              <p className="text-3xl font-bold tracking-tight text-[#17224a] sm:text-4xl">
                CERTIFICADO
              </p>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#b78d30]">
                de Conclusão
              </p>
            </div>

            <p className="text-sm text-slate-500">Certificamos que</p>
            <p className="font-serif text-2xl font-bold text-slate-900 sm:text-3xl">
              {cert.student.name}
            </p>
            <p className="text-sm text-slate-500">concluiu com êxito o curso</p>
            <p className="font-serif text-xl font-semibold text-[#17224a] sm:text-2xl">
              {cert.course.title}
            </p>

            <p className="max-w-xl text-xs text-slate-500">
              {workload ? (
                <>
                  Carga horária: <strong>{workload} horas</strong> •{" "}
                </>
              ) : null}
              Emitido por {cert.organization.name} em {dateStr}
            </p>

            <div className="mt-4 flex w-full flex-col items-center gap-1 border-t border-slate-200 pt-4 text-[11px] text-slate-400">
              <p>Nº {cert.certificateNumber}</p>
              <p>
                Código de verificação:{" "}
                <span className="font-mono font-medium text-slate-500">
                  {cert.verificationCode}
                </span>
              </p>
              <p>Verifique em /verify/{cert.verificationCode}</p>
            </div>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Dica: no PDF, use “Imprimir → Salvar como PDF” caso queira imprimir em
        papel. O download acima já gera o arquivo pronto.
      </p>
    </div>
  );
}
