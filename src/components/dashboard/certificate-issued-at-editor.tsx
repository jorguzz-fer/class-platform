"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { setCertificateIssuedAtAction } from "@/lib/actions/certificate-actions";
import { cn } from "@/lib/utils";

const inputClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

/** Formata YYYY-MM-DD como DD/MM/AAAA sem passar por fuso horário. */
function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** Data de emissão do certificado, editável (correção manual). */
export function CertificateIssuedAtEditor({
  certificateId,
  studentName,
  courseTitle,
  issuedAt,
}: {
  certificateId: string;
  studentName: string;
  courseTitle: string;
  /** Data de emissão (YYYY-MM-DD). */
  issuedAt: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(issuedAt);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await setCertificateIssuedAtAction(certificateId, date);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Data de emissão atualizada.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setDate(issuedAt);
          setOpen(true);
        }}
        className="group inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
        title="Editar data de emissão"
      >
        {formatDate(issuedAt)}
        <Pencil className="h-3 w-3 opacity-50 group-hover:opacity-100" />
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
            <h2 className="text-lg font-semibold">Data de emissão</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {studentName} • {courseTitle}
            </p>

            <div className="mt-4 flex flex-col gap-2">
              <Label htmlFor={`iss-${certificateId}`}>Emitido em</Label>
              <input
                id={`iss-${certificateId}`}
                type="date"
                className={inputClass}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={pending}
              />
              <p className="text-xs text-muted-foreground">
                A nova data aparece também no certificado do aluno, no PDF e na
                verificação pública.
              </p>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Cancelar
              </button>
              <Button size="sm" onClick={save} disabled={pending || !date}>
                {pending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
