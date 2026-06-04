"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import type { ActionResult } from "@/lib/actions/student-actions";
import { enrollStudentAction } from "@/lib/actions/student-actions";
import { Button } from "@/components/ui/button";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Matriculando..." : "Matricular"}
    </Button>
  );
}

export function EnrollStudentForm({
  studentId,
  courses,
}: {
  studentId: string;
  courses: { id: string; title: string }[];
}) {
  const [state, formAction] = useActionState<ActionResult, FormData>(
    enrollStudentAction,
    null,
  );

  if (courses.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum curso disponível para matrícula. Crie e publique cursos primeiro.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <input type="hidden" name="studentId" value={studentId} />
      <div className="flex flex-1 flex-col gap-2">
        <select name="courseId" className={selectClass} defaultValue="">
          <option value="" disabled>
            Selecione um curso
          </option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </div>
      <SubmitButton />
      {state?.error && (
        <p className="text-sm text-destructive sm:self-center">{state.error}</p>
      )}
    </form>
  );
}
