"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import type { ActionResult } from "@/lib/actions/student-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="text-sm text-destructive">{messages[0]}</p>;
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : label}
    </Button>
  );
}

export function NewStudentForm({
  action,
}: {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
}) {
  const [state, formAction] = useActionState<ActionResult, FormData>(action, null);

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Nome do aluno</Label>
        <Input id="name" name="name" required />
        <FieldError messages={state?.fieldErrors?.name} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" required />
        <FieldError messages={state?.fieldErrors?.email} />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <div>
        <SubmitButton label="Cadastrar aluno" />
      </div>
    </form>
  );
}
