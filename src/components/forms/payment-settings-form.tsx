"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import {
  savePaymentSettingsAction,
  type PaymentSettingsState,
} from "@/lib/actions/payment-settings-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CopyField } from "@/components/dashboard/copy-field";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : "Salvar"}
    </Button>
  );
}

export function PaymentSettingsForm({
  defaults,
  webhookUrl,
  webhookToken,
}: {
  defaults: {
    environment: "SANDBOX" | "PRODUCTION";
    enabled: boolean;
    apiKeyMasked: string | null;
    ready: boolean;
  };
  webhookUrl: string;
  webhookToken: string;
}) {
  const [state, formAction] = useActionState<PaymentSettingsState, FormData>(
    savePaymentSettingsAction,
    null,
  );

  useEffect(() => {
    if (state?.ok) toast.success("Configuração de pagamentos salva.");
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <div className="flex flex-col gap-6">
      {/* Status atual */}
      <div className="rounded-lg border p-4 text-sm">
        {defaults.ready ? (
          <p className="font-medium text-emerald-600">
            ✓ Pagamentos ativos — cursos pagos vão para o checkout da Asaas desta
            escola.
          </p>
        ) : (
          <p className="text-muted-foreground">
            Pagamentos ainda não ativos. Configure sua conta Asaas abaixo para
            vender cursos pagos. Enquanto isso, cursos pagos não podem ser
            comprados.
          </p>
        )}
      </div>

      {/* Dados para configurar o webhook na Asaas */}
      <div className="flex flex-col gap-3 rounded-lg border p-4">
        <p className="text-sm font-medium">Webhook (configure na sua conta Asaas)</p>
        <p className="text-xs text-muted-foreground">
          Na Asaas, em <strong>Integrações → Webhooks</strong>, crie um webhook
          apontando para a URL abaixo e cole o Token de autenticação. É assim que
          a Asaas nos avisa quando um pagamento é confirmado.
        </p>
        <div className="flex flex-col gap-1">
          <Label>URL do webhook</Label>
          <CopyField value={webhookUrl} />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Token de autenticação</Label>
          <CopyField value={webhookToken} />
        </div>
      </div>

      {/* Credenciais */}
      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="environment">Ambiente</Label>
          <select
            id="environment"
            name="environment"
            className={selectClass}
            defaultValue={defaults.environment}
          >
            <option value="SANDBOX">Sandbox (testes)</option>
            <option value="PRODUCTION">Produção</option>
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="apiKey">API Key da Asaas</Label>
          <Input
            id="apiKey"
            name="apiKey"
            type="password"
            autoComplete="off"
            placeholder={
              defaults.apiKeyMasked
                ? `Salva: ${defaults.apiKeyMasked} — deixe em branco para manter`
                : "Cole a API Key da sua conta Asaas"
            }
          />
          {state?.fieldErrors?.apiKey && (
            <p className="text-sm text-destructive">{state.fieldErrors.apiKey[0]}</p>
          )}
          <p className="text-xs text-muted-foreground">
            A chave fica cifrada no servidor — nunca a exibimos de volta.
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="enabled"
            defaultChecked={defaults.enabled}
            className="h-4 w-4 rounded border-input"
          />
          Habilitar cobrança nesta escola
        </label>

        {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

        <div>
          <SaveButton />
        </div>
      </form>
    </div>
  );
}
