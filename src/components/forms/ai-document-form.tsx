"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { FileUp } from "lucide-react";

import {
  generateCourseFromDocumentAction,
  type AIResult,
} from "@/lib/actions/ai-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const fileInputClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="gap-2" disabled={pending}>
      <FileUp className="h-4 w-4" />
      {pending ? "Organizando documento…" : "Gerar curso do documento"}
    </Button>
  );
}

export function AIDocumentForm() {
  const [state, formAction] = useActionState<AIResult, FormData>(
    generateCourseFromDocumentAction,
    null,
  );

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="doc-file">Documento (PDF, DOCX ou TXT)</Label>
        <input
          id="doc-file"
          name="file"
          type="file"
          accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          className={fileInputClass}
          required
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="doc-level">Nível (opcional)</Label>
          <Input id="doc-level" name="level" placeholder="Iniciante" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="doc-audience">Público (opcional)</Label>
          <Input id="doc-audience" name="audience" placeholder="Operadores de NR-33" />
        </div>
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <div>
        <SubmitButton />
      </div>
      <p className="text-xs text-muted-foreground">
        A IA lê o documento (incluindo <strong>PDF de slides/imagens</strong>,
        que ela transcreve) e organiza o conteúdo em um curso — módulos e aulas
        de texto — como rascunho, para você revisar e publicar. Pode levar até
        ~1 minuto em arquivos grandes.
      </p>
    </form>
  );
}
