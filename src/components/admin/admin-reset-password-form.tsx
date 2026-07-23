"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import type { AdminFormResult } from "@/lib/actions/admin-actions";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : "Definir nova senha"}
    </Button>
  );
}

// Gera uma senha forte (sem caracteres ambíguos) usando CSPRNG do navegador.
function generatePassword(length = 14): string {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*";
  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr, (n) => charset[n % charset.length]).join("");
}

export function AdminResetPasswordForm({
  action,
  userName,
}: {
  action: (prev: AdminFormResult, formData: FormData) => Promise<AdminFormResult>;
  userName: string;
}) {
  const [state, formAction] = useActionState<AdminFormResult, FormData>(action, null);
  const [value, setValue] = useState("");

  useEffect(() => {
    if (state?.ok) {
      toast.success("Senha redefinida.");
      setValue("");
    } else if (state?.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Nova senha</Label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          required
        />
        {state?.fieldErrors?.password && (
          <p className="text-sm text-destructive">{state.fieldErrors.password[0]}</p>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Mínimo 8 caracteres. A senha <strong>não é enviada por e-mail</strong> —
        você precisa informá-la a {userName}. Os links de redefinição pendentes
        desse usuário são invalidados.
      </p>

      {state?.ok && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          Senha redefinida com sucesso.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton />
        <Button
          type="button"
          variant="outline"
          onClick={() => setValue(generatePassword())}
        >
          Gerar senha forte
        </Button>
      </div>
    </form>
  );
}
