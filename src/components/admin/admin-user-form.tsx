"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";

import type { AdminFormResult } from "@/lib/actions/admin-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ROLES: { value: string; label: string }[] = [
  { value: "SUPER_ADMIN", label: "Super Admin (plataforma)" },
  { value: "ORG_OWNER", label: "Dono da escola" },
  { value: "ORG_ADMIN", label: "Admin da escola" },
  { value: "INSTRUCTOR", label: "Instrutor" },
  { value: "SUPPORT", label: "Suporte" },
  { value: "STUDENT", label: "Aluno" },
];

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

function FieldError({ messages }: { messages?: string[] }) {
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

export function AdminUserForm({
  action,
  defaults,
}: {
  action: (prev: AdminFormResult, formData: FormData) => Promise<AdminFormResult>;
  defaults: { name: string; email: string; role: string; isActive: boolean };
}) {
  const [state, formAction] = useActionState<AdminFormResult, FormData>(
    action,
    null,
  );

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Nome</Label>
        <Input id="name" name="name" defaultValue={defaults.name} required />
        <FieldError messages={state?.fieldErrors?.name} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={defaults.email}
          required
        />
        <FieldError messages={state?.fieldErrors?.email} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="role">Papel</Label>
        <select
          id="role"
          name="role"
          className={selectClass}
          defaultValue={defaults.role}
        >
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <FieldError messages={state?.fieldErrors?.role} />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={defaults.isActive}
        />
        Conta ativa
      </label>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex items-center gap-3">
        <SubmitButton />
        <Link
          href="/admin/users"
          className="text-sm text-muted-foreground hover:underline"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
