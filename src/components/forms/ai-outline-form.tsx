"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Sparkles, Loader2 } from "lucide-react";

import { generateCourseOutlineAction, type AIResult } from "@/lib/actions/ai-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="gap-2" disabled={pending}>
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Sparkles className="h-4 w-4" />
      )}
      {pending ? "Gerando..." : "Gerar curso com IA"}
    </Button>
  );
}

export function AIOutlineForm() {
  const [state, formAction] = useActionState<AIResult, FormData>(
    generateCourseOutlineAction,
    null,
  );

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="topic">Tema do curso</Label>
        <Input id="topic" name="topic" placeholder="Ex.: Marketing digital para iniciantes" required />
        {state?.fieldErrors?.topic && (
          <p className="text-sm text-destructive">{state.fieldErrors.topic[0]}</p>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="level">Nível (opcional)</Label>
          <Input id="level" name="level" placeholder="Iniciante" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="audience">Público (opcional)</Label>
          <Input id="audience" name="audience" placeholder="Pequenos empreendedores" />
        </div>
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <div>
        <SubmitButton />
      </div>
      <p className="text-xs text-muted-foreground">
        A IA cria um rascunho de curso com módulos e aulas. Você revisa e edita antes de publicar.
      </p>
    </form>
  );
}
