"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { addStudentToCohortAction } from "@/lib/actions/company-actions";
import { Button } from "@/components/ui/button";

const selectClass =
  "flex h-9 flex-1 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export function CohortAddStudent({
  cohortId,
  students,
}: {
  cohortId: string;
  students: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (students.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Todos os alunos disponíveis já estão na turma.
      </p>
    );
  }

  return (
    <form
      action={(formData) => {
        const studentId = String(formData.get("studentId") ?? "");
        if (!studentId) return;
        startTransition(async () => {
          const result = await addStudentToCohortAction(cohortId, studentId);
          if (result?.error) toast.error(result.error);
          else {
            toast.success("Aluno adicionado à turma.");
            router.refresh();
          }
        });
      }}
      className="flex gap-2"
    >
      <select name="studentId" className={selectClass} defaultValue="">
        <option value="" disabled>
          Selecione um aluno
        </option>
        {students.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <Button type="submit" disabled={pending}>
        Adicionar
      </Button>
    </form>
  );
}
