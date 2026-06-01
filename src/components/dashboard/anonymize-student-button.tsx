"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { anonymizeStudentAction } from "@/lib/actions/privacy-actions";

export function AnonymizeStudentButton({ studentId }: { studentId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="destructive"
      size="sm"
      className="gap-2"
      disabled={pending}
      onClick={() => {
        if (
          !confirm(
            "Anonimizar este aluno? Os dados pessoais (nome, e-mail) serão removidos de forma permanente. O histórico de matrículas é preservado de forma anônima. Esta ação não pode ser desfeita.",
          )
        ) {
          return;
        }
        startTransition(async () => {
          // Em caso de sucesso a action redireciona; só tratamos erro.
          const result = await anonymizeStudentAction(studentId);
          if (result?.error) toast.error(result.error);
        });
      }}
    >
      <ShieldAlert className="h-4 w-4" />
      {pending ? "Anonimizando..." : "Anonimizar (LGPD)"}
    </Button>
  );
}
