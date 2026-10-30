"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { saveStudentOperationsAction } from "@/lib/actions/student-actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** Edita a lista de operações da escola (uma por linha). */
export function StudentOperationsForm({ operations }: { operations: string[] }) {
  const router = useRouter();
  const [text, setText] = useState(operations.join("\n"));
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  const count = text.split(/\r?\n/).filter((l) => l.trim()).length;

  function save() {
    const formData = new FormData();
    formData.set("operations", text);
    startTransition(async () => {
      const result = await saveStudentOperationsAction(null, formData);
      if (result?.fieldErrors?.operations?.length) {
        setErrors(result.fieldErrors.operations);
        return;
      }
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      setErrors([]);
      toast.success("Operações salvas.");
      router.refresh();
    });
  }

  return (
    <div className="flex max-w-xl flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor="operations">Operações (uma por linha)</Label>
        <Textarea
          id="operations"
          rows={14}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"Ex.:\nUnidade Centro\nUnidade Norte"}
          disabled={pending}
        />
        <p className="text-xs text-muted-foreground">
          {count} {count === 1 ? "operação" : "operações"}. Linhas vazias e
          repetidas são ignoradas. Deixe em branco para esconder o campo
          &quot;Operação&quot; do cadastro de alunos.
        </p>
        {errors.length > 0 && <p className="text-sm text-destructive">{errors[0]}</p>}
      </div>
      <div>
        <Button onClick={save} disabled={pending}>
          {pending ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </div>
  );
}
