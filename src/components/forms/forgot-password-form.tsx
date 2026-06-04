"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";

import {
  forgotPasswordAction,
  type PasswordFormState,
} from "@/lib/actions/password-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Enviando..." : "Enviar link de redefinição"}
    </Button>
  );
}

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState<PasswordFormState, FormData>(
    forgotPasswordAction,
    null,
  );

  if (state?.ok) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <p className="text-sm text-muted-foreground">
          Se houver uma conta com esse e-mail, enviamos um link para redefinir a
          senha. Verifique sua caixa de entrada.
        </p>
        <Link href="/login" className="text-sm text-primary hover:underline">
          Voltar ao login
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
        {state?.fieldErrors?.email && (
          <p className="text-sm text-destructive">{state.fieldErrors.email[0]}</p>
        )}
      </div>
      <SubmitButton />
      <Link
        href="/login"
        className="text-center text-sm text-muted-foreground hover:underline"
      >
        Voltar ao login
      </Link>
    </form>
  );
}
