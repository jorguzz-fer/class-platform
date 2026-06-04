"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { createCompanyAction, type CompanyState } from "@/lib/actions/company-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Criando..." : "Criar empresa"}
    </Button>
  );
}

export function CompanyForm() {
  const [state, formAction] = useActionState<CompanyState, FormData>(
    createCompanyAction,
    null,
  );

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Nome da empresa</Label>
        <Input id="name" name="name" required />
        {state?.fieldErrors?.name && (
          <p className="text-sm text-destructive">{state.fieldErrors.name[0]}</p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="cnpj">CNPJ (opcional)</Label>
        <Input id="cnpj" name="cnpj" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="contactEmail">E-mail de contato (opcional)</Label>
        <Input id="contactEmail" name="contactEmail" type="email" />
        {state?.fieldErrors?.contactEmail && (
          <p className="text-sm text-destructive">{state.fieldErrors.contactEmail[0]}</p>
        )}
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <div>
        <SubmitButton />
      </div>
    </form>
  );
}
