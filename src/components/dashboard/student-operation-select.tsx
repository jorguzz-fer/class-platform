"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { setStudentOperationAction } from "@/lib/actions/student-actions";

const selectClass =
  "h-9 w-full max-w-xs rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60";

/** Troca a operação do aluno direto na página dele (salva ao escolher). */
export function StudentOperationSelect({
  studentId,
  operation,
  operations,
}: {
  studentId: string;
  operation: string | null;
  operations: string[];
}) {
  const router = useRouter();
  const [value, setValue] = useState(operation ?? "");
  const [pending, startTransition] = useTransition();

  // Mantém visível um valor antigo que saiu da lista, para não "sumir".
  const options =
    value && !operations.includes(value) ? [value, ...operations] : operations;

  function change(next: string) {
    const previous = value;
    setValue(next);
    startTransition(async () => {
      const result = await setStudentOperationAction(studentId, next);
      if (result?.error) {
        setValue(previous);
        toast.error(result.error);
      } else {
        toast.success("Operação atualizada.");
        router.refresh();
      }
    });
  }

  return (
    <select
      aria-label="Operação"
      value={value}
      onChange={(e) => change(e.target.value)}
      disabled={pending}
      className={selectClass}
    >
      <option value="">Sem operação</option>
      {options.map((op) => (
        <option key={op} value={op}>
          {op}
        </option>
      ))}
    </select>
  );
}
