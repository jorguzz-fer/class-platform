"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import { updateDomainAction, type SettingsState } from "@/lib/actions/school-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

export function DomainForm({
  defaults,
  canCustomDomain,
}: {
  defaults: { subdomain?: string | null; customDomain?: string | null };
  canCustomDomain: boolean;
}) {
  const [state, formAction] = useActionState<SettingsState, FormData>(
    updateDomainAction,
    null,
  );

  useEffect(() => {
    if (state?.ok) toast.success("Domínio atualizado.");
    else if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="subdomain">Subdomínio</Label>
        <div className="flex items-center gap-2">
          <Input id="subdomain" name="subdomain" placeholder="minha-escola" defaultValue={defaults.subdomain ?? ""} />
          <span className="text-sm text-muted-foreground">.classos.app</span>
        </div>
        <Field messages={state?.fieldErrors?.subdomain} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="customDomain">Domínio próprio</Label>
        <Input
          id="customDomain"
          name="customDomain"
          placeholder="cursos.suaescola.com.br"
          defaultValue={defaults.customDomain ?? ""}
          disabled={!canCustomDomain}
        />
        {!canCustomDomain && (
          <p className="text-xs text-muted-foreground">
            Domínio próprio disponível em planos superiores.
          </p>
        )}
        <Field messages={state?.fieldErrors?.customDomain} />
      </div>

      <div>
        <SubmitButton />
      </div>
    </form>
  );
}
