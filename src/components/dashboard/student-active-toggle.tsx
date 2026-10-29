"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { setStudentActiveAction } from "@/lib/actions/student-actions";

/**
 * Status Ativo/Inativo do aluno, alternável direto na lista. Inativar tira o
 * acesso do aluno — por isso pedimos confirmação.
 */
export function StudentActiveToggle({
  studentId,
  isActive,
}: {
  studentId: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !isActive;
    if (!next && !confirm("Inativar este aluno? Ele perde o acesso ao portal.")) {
      return;
    }
    startTransition(async () => {
      const result = await setStudentActiveAction(studentId, next);
      if (result?.error) toast.error(result.error);
      else {
        toast.success(next ? "Aluno ativado." : "Aluno inativado.");
        router.refresh();
      }
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className="cursor-pointer disabled:opacity-60"
      title="Clique para alterar o status"
    >
      {isActive ? (
        <Badge variant="secondary">Ativo</Badge>
      ) : (
        <Badge variant="outline">Inativo</Badge>
      )}
    </button>
  );
}
