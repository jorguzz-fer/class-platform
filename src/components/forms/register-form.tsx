"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";

import { registerAction, type FormState } from "@/lib/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Criando escola..." : "Criar escola"}
    </Button>
  );
}

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="text-sm text-destructive">{messages[0]}</p>;
}

export function RegisterForm() {
  const [state, formAction] = useActionState<FormState, FormData>(
    registerAction,
    null,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Seu nome</Label>
        <Input id="name" name="name" autoComplete="name" required />
        <FieldError messages={state?.fieldErrors?.name} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
        <FieldError messages={state?.fieldErrors?.email} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
        />
        <FieldError messages={state?.fieldErrors?.password} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="schoolName">Nome da escola</Label>
        <Input id="schoolName" name="schoolName" required />
        <FieldError messages={state?.fieldErrors?.schoolName} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="schoolSlug">Endereço da escola</Label>
        <Input
          id="schoolSlug"
          name="schoolSlug"
          placeholder="minha-escola"
          required
        />
        <p className="text-xs text-muted-foreground">
          Usado no endereço: minha-escola.classos.app
        </p>
        <FieldError messages={state?.fieldErrors?.schoolSlug} />
      </div>

      <div className="flex flex-col gap-1">
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="acceptTerms" className="mt-1" required />
          <span>
            Li e aceito os{" "}
            <Link href="/terms" className="text-primary hover:underline">
              Termos de Uso
            </Link>{" "}
            e a{" "}
            <Link href="/privacy" className="text-primary hover:underline">
              Política de Privacidade
            </Link>
            .
          </span>
        </label>
        <FieldError messages={state?.fieldErrors?.acceptTerms} />
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <SubmitButton />

      <p className="text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link href="/login" className="hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}
