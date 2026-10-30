"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { setCertificateAttendanceAction } from "@/lib/actions/certificate-actions";

/**
 * Marca/desmarca presença no treinamento presencial de um certificado.
 * Ao marcar, a data de presença vira a mesma da emissão (feita no servidor).
 */
export function CertificateAttendanceToggle({
  certificateId,
  attended,
  attendedAt,
}: {
  certificateId: string;
  attended: boolean;
  /** Data de presença formatada (pt-BR), quando houver. */
  attendedAt: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !attended;
    startTransition(async () => {
      const result = await setCertificateAttendanceAction(certificateId, next);
      if (result?.error) toast.error(result.error);
      else {
        toast.success(next ? "Presença marcada." : "Presença removida.");
        router.refresh();
      }
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className="disabled:opacity-60"
      title={
        attended
          ? "Esteve presente no treinamento presencial — clique para remover"
          : "Marcar presença no treinamento presencial"
      }
    >
      {attended ? (
        <Badge variant="secondary" className="gap-1">
          <Check className="h-3 w-3" />
          Presente{attendedAt ? ` • ${attendedAt}` : ""}
        </Badge>
      ) : (
        <Badge variant="outline" className="text-muted-foreground">
          Marcar presença
        </Badge>
      )}
    </button>
  );
}
