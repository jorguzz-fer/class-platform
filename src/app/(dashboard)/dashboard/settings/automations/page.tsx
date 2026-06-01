import { redirect } from "next/navigation";

import { requireOrg } from "@/lib/tenant";
import { can } from "@/lib/permissions";
import { listWebhooks } from "@/services/webhook.service";
import { SettingsNav } from "@/components/dashboard/settings-nav";
import { WebhookManager } from "@/components/dashboard/webhook-manager";

export default async function AutomationsSettingsPage() {
  const ctx = await requireOrg();
  if (!can(ctx.role, "org:manage")) redirect("/dashboard");

  const webhooks = await listWebhooks(ctx.organizationId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">
          Automações: envie eventos da sua escola para n8n, Zapier ou seus próprios sistemas.
        </p>
      </div>
      <SettingsNav />
      <WebhookManager
        webhooks={webhooks.map((w) => ({
          id: w.id,
          url: w.url,
          events: w.events,
          isActive: w.isActive,
          deliveries: w._count.deliveries,
        }))}
      />
    </div>
  );
}
