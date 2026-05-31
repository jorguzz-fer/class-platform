"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import type { CourseFormState } from "@/lib/actions/course-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const LEVELS = [
  { value: "ALL_LEVELS", label: "Todos os níveis" },
  { value: "BEGINNER", label: "Iniciante" },
  { value: "INTERMEDIATE", label: "Intermediário" },
  { value: "ADVANCED", label: "Avançado" },
];

const VISIBILITIES = [
  { value: "PRIVATE", label: "Privado (só matriculados)" },
  { value: "PUBLIC", label: "Público" },
  { value: "UNLISTED", label: "Não listado" },
];

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

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

type CourseDefaults = {
  title?: string;
  subtitle?: string | null;
  description?: string | null;
  level?: string;
  visibility?: string;
  category?: string | null;
  thumbnailUrl?: string | null;
  price?: string | null;
};

export function CourseForm({
  action,
  defaults,
  submitLabel,
  showExtraFields = false,
}: {
  action: (prev: CourseFormState, formData: FormData) => Promise<CourseFormState>;
  defaults?: CourseDefaults;
  submitLabel: string;
  showExtraFields?: boolean;
}) {
  const [state, formAction] = useActionState<CourseFormState, FormData>(
    action,
    null,
  );

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="title">Título</Label>
        <Input id="title" name="title" defaultValue={defaults?.title} required />
        <FieldError messages={state?.fieldErrors?.title} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="subtitle">Subtítulo</Label>
        <Input
          id="subtitle"
          name="subtitle"
          defaultValue={defaults?.subtitle ?? ""}
        />
        <FieldError messages={state?.fieldErrors?.subtitle} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          name="description"
          rows={5}
          defaultValue={defaults?.description ?? ""}
        />
        <FieldError messages={state?.fieldErrors?.description} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="level">Nível</Label>
          <select
            id="level"
            name="level"
            className={selectClass}
            defaultValue={defaults?.level ?? "ALL_LEVELS"}
          >
            {LEVELS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="visibility">Visibilidade</Label>
          <select
            id="visibility"
            name="visibility"
            className={selectClass}
            defaultValue={defaults?.visibility ?? "PRIVATE"}
          >
            {VISIBILITIES.map((v) => (
              <option key={v.value} value={v.value}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="category">Categoria</Label>
        <Input
          id="category"
          name="category"
          defaultValue={defaults?.category ?? ""}
        />
      </div>

      {showExtraFields && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="thumbnailUrl">URL da imagem (thumbnail)</Label>
            <Input
              id="thumbnailUrl"
              name="thumbnailUrl"
              type="url"
              defaultValue={defaults?.thumbnailUrl ?? ""}
            />
            <FieldError messages={state?.fieldErrors?.thumbnailUrl} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="price">Preço (BRL)</Label>
            <Input
              id="price"
              name="price"
              type="number"
              step="0.01"
              min="0"
              defaultValue={defaults?.price ?? ""}
            />
            <FieldError messages={state?.fieldErrors?.price} />
          </div>
        </div>
      )}

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div>
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}
