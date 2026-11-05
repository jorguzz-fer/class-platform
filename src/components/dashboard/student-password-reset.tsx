"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { KeyRound, Mail, RefreshCw } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CopyField } from "@/components/dashboard/copy-field";
import {
  sendStudentPasswordResetAction,
  setStudentPasswordAction,
} from "@/lib/actions/student-actions";
import { cn } from "@/lib/utils";

// Sem caracteres ambíguos (0/O, 1/l/I) — fácil de ditar ou digitar.
const ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generatePassword(length = 10): string {
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (n) => ALPHABET[n % ALPHABET.length]).join("");
}

/**
 * Redefinição de senha do aluno pela escola: envia o link por e-mail ou define
 * uma senha provisória (só para contas exclusivas desta escola).
 */
export function StudentPasswordReset({
  studentId,
  email,
  canSetPassword,
}: {
  studentId: string;
  email: string;
  /** Conta exclusiva desta escola: a escola pode definir a senha direto. */
  canSetPassword: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [savedPassword, setSavedPassword] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function openModal() {
    setPassword(generatePassword());
    setSavedPassword(null);
    setError(null);
    setOpen(true);
  }

  function sendLink() {
    startTransition(async () => {
      const result = await sendStudentPasswordResetAction(studentId);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`Link de redefinição enviado para ${email}.`);
      setOpen(false);
    });
  }

  function savePassword() {
    setError(null);
    startTransition(async () => {
      const result = await setStudentPasswordAction(studentId, password);
      if (result?.fieldErrors?.password?.length) {
        setError(result.fieldErrors.password[0]);
        return;
      }
      if (result?.error) {
        setError(result.error);
        return;
      }
      setSavedPassword(password);
      toast.success("Senha provisória definida.");
    });
  }

  return (
    <>
      <Button variant="outline" className="w-fit gap-2" onClick={openModal}>
        <KeyRound className="h-4 w-4" />
        Redefinir senha
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !pending && setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-lg border bg-background p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold">Redefinir senha</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">{email}</p>

            {/* Opção 1: link por e-mail (sempre disponível) */}
            <div className="mt-5 flex flex-col gap-2 rounded-md border p-3">
              <p className="text-sm font-medium">Enviar link por e-mail</p>
              <p className="text-xs text-muted-foreground">
                O aluno recebe um link (válido por 1 hora) para criar a nova senha.
              </p>
              <Button
                size="sm"
                variant="secondary"
                className="w-fit gap-2"
                onClick={sendLink}
                disabled={pending}
              >
                <Mail className="h-4 w-4" />
                Enviar link
              </Button>
            </div>

            {/* Opção 2: senha provisória (só contas exclusivas da escola) */}
            <div className="mt-3 flex flex-col gap-2 rounded-md border p-3">
              <p className="text-sm font-medium">Definir senha provisória</p>
              {canSetPassword ? (
                savedPassword ? (
                  <>
                    <p className="text-xs text-muted-foreground">
                      Senha definida. Copie e passe ao aluno — ela não será
                      mostrada de novo. Ele pode trocá-la depois em
                      &quot;Esqueci a senha&quot;.
                    </p>
                    <CopyField value={savedPassword} />
                  </>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">
                      Útil quando o e-mail não chega. Você passa a senha ao aluno.
                    </p>
                    <Label htmlFor="new-password" className="sr-only">
                      Nova senha
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="off"
                        spellCheck={false}
                        className="font-mono"
                        disabled={pending}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setPassword(generatePassword())}
                        disabled={pending}
                        aria-label="Gerar outra senha"
                        title="Gerar outra senha"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <Button
                      size="sm"
                      className="w-fit"
                      onClick={savePassword}
                      disabled={pending || password.length < 8}
                    >
                      {pending ? "Salvando..." : "Definir senha"}
                    </Button>
                  </>
                )
              ) : (
                <p className="text-xs text-muted-foreground">
                  Indisponível: este aluno também tem acesso em outra escola. Por
                  segurança, use o link por e-mail.
                </p>
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
