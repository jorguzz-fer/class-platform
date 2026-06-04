"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import { updateBrandingAction, type SettingsState } from "@/lib/actions/school-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function Field({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="text-sm text-destructive">{messages[0]}</p>;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : "Salvar"}
    </Button>
  );
}

type Defaults = {
  name?: string;
  description?: string | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  backgroundColor?: string | null;
};

export function BrandingForm({ defaults }: { defaults: Defaults }) {
  const [state, formAction] = useActionState<SettingsState, FormData>(
    updateBrandingAction,
    null,
  );

  useEffect(() => {
    if (state?.ok) toast.success("Marca atualizada.");
    else if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Nome da escola</Label>
        <Input id="name" name="name" defaultValue={defaults.name} required />
        <Field messages={state?.fieldErrors?.name} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea id="description" name="description" rows={3} defaultValue={defaults.description ?? ""} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="logoUrl">URL do logo</Label>
          <Input id="logoUrl" name="logoUrl" type="url" defaultValue={defaults.logoUrl ?? ""} />
          <Field messages={state?.fieldErrors?.logoUrl} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="faviconUrl">URL do favicon</Label>
          <Input id="faviconUrl" name="faviconUrl" type="url" defaultValue={defaults.faviconUrl ?? ""} />
          <Field messages={state?.fieldErrors?.faviconUrl} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {(["primaryColor", "secondaryColor", "backgroundColor"] as const).map((field) => (
          <div key={field} className="flex flex-col gap-2">
            <Label htmlFor={field}>
              {field === "primaryColor"
                ? "Cor primária"
                : field === "secondaryColor"
                  ? "Cor secundária"
                  : "Cor de fundo"}
            </Label>
            <Input
              id={field}
              name={field}
              placeholder="#000000"
              defaultValue={defaults[field] ?? ""}
            />
            <Field messages={state?.fieldErrors?.[field]} />
          </div>
        ))}
      </div>
      <div>
        <SubmitButton />
      </div>
    </form>
  );
}
