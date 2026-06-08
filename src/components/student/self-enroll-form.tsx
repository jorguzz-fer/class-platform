"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";

import {
  selfEnrollAction,
  type SelfEnrollState,
} from "@/lib/actions/self-enroll-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Enviando..." : "Solicitar inscrição"}
    </Button>
  );
}

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="text-sm text-destructive">{messages[0]}</p>;
}

export function SelfEnrollForm({
  schoolSlug,
  courseSlug,
}: {
  schoolSlug: string;
  courseSlug: string;
}) {
  const [state, formAction] = useActionState<SelfEnrollState, FormData>(
    selfEnrollAction,
    null,
  );

  return (
    <form action={formAction} className="flex w-full flex-col gap-3 text-left">
      <input type="hidden" name="schoolSlug" value={schoolSlug} />
      <input type="hidden" name="courseSlug" value={courseSlug} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Seu nome</Label>
        <Input id="name" name="name" autoComplete="name" required />
        <FieldError messages={state?.fieldErrors?.name} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
        <FieldError messages={state?.fieldErrors?.email} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Crie uma senha</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
        />
        <FieldError messages={state?.fieldErrors?.password} />
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <SubmitButton />

      <p className="text-center text-xs text-muted-foreground">
        Já tem conta?{" "}
        <Link href="/login" className="underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}
