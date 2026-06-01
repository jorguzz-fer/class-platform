"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import { updateProfileAction, type ProfileState } from "@/lib/actions/profile-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : "Salvar"}
    </Button>
  );
}

export function ProfileForm({
  defaults,
  email,
}: {
  defaults: { name: string; avatarUrl: string | null };
  email: string;
}) {
  const [state, formAction] = useActionState<ProfileState, FormData>(
    updateProfileAction,
    null,
  );

  useEffect(() => {
    if (state?.ok) toast.success("Perfil atualizado.");
    else if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Nome</Label>
        <Input id="name" name="name" defaultValue={defaults.name} required />
        {state?.fieldErrors?.name && (
          <p className="text-sm text-destructive">{state.fieldErrors.name[0]}</p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Label>E-mail</Label>
        <Input defaultValue={email} disabled />
        <p className="text-xs text-muted-foreground">O e-mail não pode ser alterado.</p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="avatarUrl">URL do avatar</Label>
        <Input id="avatarUrl" name="avatarUrl" type="url" defaultValue={defaults.avatarUrl ?? ""} />
        {state?.fieldErrors?.avatarUrl && (
          <p className="text-sm text-destructive">{state.fieldErrors.avatarUrl[0]}</p>
        )}
      </div>
      <div>
        <SubmitButton />
      </div>
    </form>
  );
}
