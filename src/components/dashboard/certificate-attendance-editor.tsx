"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { setCertificateAttendanceAction } from "@/lib/actions/certificate-actions";
import { cn } from "@/lib/utils";

const inputClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

/** Formata YYYY-MM-DD como DD/MM/AAAA sem passar por fuso horário. */
function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/**
 * Presença no treinamento presencial, com data própria e editável. Ao marcar,
 * a data sugerida é a de emissão do certificado; quem marca pode trocá-la.
 */
export function CertificateAttendanceEditor({
  certificateId,
  studentName,
  courseTitle,
  issuedAt,
  attendedAt,
}: {
  certificateId: string;
  studentName: string;
  courseTitle: string;
  /** Data de emissão (YYYY-MM-DD), sugerida ao marcar presença. */
  issuedAt: string;
  /** Data de presença (YYYY-MM-DD) ou null se não esteve presente. */
  attendedAt: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(attendedAt ?? issuedAt);
  const [pending, startTransition] = useTransition();

  function submit(next: string | null) {
    startTransition(async () => {
      const result = await setCertificateAttendanceAction(certificateId, next);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success(next ? "Presença salva." : "Presença removida.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setDate(attendedAt ?? issuedAt);
          setOpen(true);
        }}
        title={attendedAt ? "Editar presença" : "Marcar presença no treinamento presencial"}
      >
        {attendedAt ? (
          <Badge variant="secondary" className="gap-1">
            <Check className="h-3 w-3" />
            Presente • {formatDate(attendedAt)}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            Marcar presença
          </Badge>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !pending && setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-lg border bg-background p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold">Presença no treinamento presencial</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {studentName} • {courseTitle}
            </p>

            <div className="mt-4 flex flex-col gap-2">
              <Label htmlFor={`att-${certificateId}`}>Data da presença</Label>
              <input
                id={`att-${certificateId}`}
                type="date"
                className={inputClass}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={pending}
              />
              <p className="text-xs text-muted-foreground">
                Emissão do certificado: {formatDate(issuedAt)}
              </p>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
              {attendedAt ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => submit(null)}
                  disabled={pending}
                >
                  Remover presença
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                  onClick={() => setOpen(false)}
                  disabled={pending}
                >
                  Cancelar
                </button>
                <Button size="sm" onClick={() => submit(date)} disabled={pending || !date}>
                  {pending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
