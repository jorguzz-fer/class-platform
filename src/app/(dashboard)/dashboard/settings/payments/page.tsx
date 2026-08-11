import { redirect } from "next/navigation";

import { requireOrg } from "@/lib/tenant";
import { can } from "@/lib/permissions";
import { getPaymentAccountView } from "@/services/payment-account.service";
import { SettingsNav } from "@/components/dashboard/settings-nav";
import { PaymentSettingsForm } from "@/components/forms/payment-settings-form";

export default async function PaymentSettingsPage() {
  const ctx = await requireOrg();
  if (!can(ctx.role, "org:manage_billing")) redirect("/dashboard");

  const account = await getPaymentAccountView(ctx.organizationId);

  const appUrl = (process.env.AUTH_URL ?? "").replace(/\/$/, "");
  const webhookUrl = appUrl
    ? `${appUrl}/api/payments/webhook`
    : "/api/payments/webhook (defina AUTH_URL no servidor)";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">
          Conecte sua conta Asaas para vender cursos pagos. O dinheiro cai direto
          na sua conta — a ClassOS não intermedia o pagamento.
        </p>
      </div>
      <SettingsNav />
      <div className="max-w-2xl">
        <PaymentSettingsForm
          defaults={{
            environment: account.environment,
            enabled: account.enabled,
            apiKeyMasked: account.apiKeyMasked,
            ready: account.ready,
          }}
          webhookUrl={webhookUrl}
          webhookToken={account.webhookToken}
        />
      </div>
    </div>
  );
}
