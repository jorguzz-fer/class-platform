"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Award } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  issueEnrollmentCertificateAction,
  issuePendingCertificatesAction,
} from "@/lib/actions/student-actions";

/** Emite o certificado de uma matrícula concluída que ainda não tem. */
export function IssueCertificateButton({ enrollmentId }: { enrollmentId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      className="gap-1"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await issueEnrollmentCertificateAction(enrollmentId);
          if (result?.error) {
            toast.error(result.error);
            return;
          }
          toast.success("Certificado emitido.");
          router.refresh();
        })
      }
    >
      <Award className="h-3.5 w-3.5" />
      {pending ? "Emitindo..." : "Emitir certificado"}
    </Button>
  );
}

/** Emite de uma vez os certificados de todas as matrículas concluídas pendentes. */
export function IssuePendingCertificatesButton({ count }: { count: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      className="w-fit gap-2"
      disabled={pending}
      onClick={() => {
        if (
          !confirm(
            `Emitir ${count} certificado(s) para alunos que já concluíram o curso e ainda não têm certificado?`,
          )
        ) {
          return;
        }
        startTransition(async () => {
          const result = await issuePendingCertificatesAction();
          if ("error" in result) {
            toast.error(result.error);
            return;
          }
          if (result.failed > 0) {
            toast.warning(
              `${result.issued} certificado(s) emitido(s); ${result.failed} não puderam ser emitidos.`,
            );
          } else {
            toast.success(`${result.issued} certificado(s) emitido(s).`);
          }
          router.refresh();
        })
      }}
    >
      <Award className="h-4 w-4" />
      {pending ? "Emitindo..." : `Emitir certificados pendentes (${count})`}
    </Button>
  );
}
