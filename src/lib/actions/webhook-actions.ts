"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireOrg } from "@/lib/tenant";
import { assertPermission } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import {
  createWebhook,
  deleteWebhook,
  WEBHOOK_EVENTS,
} from "@/services/webhook.service";

const createWebhookSchema = z.object({
  url: z.string().trim().url("URL inválida").max(500),
  events: z.array(z.enum(WEBHOOK_EVENTS)).min(1, "Selecione ao menos um evento"),
});

export type WebhookState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string[]> } | null;

export async function createWebhookAction(
  _prev: WebhookState,
  formData: FormData,
): Promise<WebhookState> {
  const ctx = await requireOrg();
  assertPermission(ctx.role, "org:manage");

  const parsed = createWebhookSchema.safeParse({
    url: formData.get("url"),
    events: formData.getAll("events"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const webhook = await createWebhook(ctx.organizationId, parsed.data.url, parsed.data.events);
  await audit({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: "webhook.create",
    entityType: "Webhook",
    entityId: webhook.id,
  });

  revalidatePath("/dashboard/settings/automations");
  return { ok: true };
}

export async function deleteWebhookAction(webhookId: string): Promise<WebhookState> {
  const ctx = await requireOrg();
  assertPermission(ctx.role, "org:manage");

  const ok = await deleteWebhook(ctx.organizationId, webhookId);
  if (!ok) return { error: "Webhook não encontrado." };

  revalidatePath("/dashboard/settings/automations");
  return { ok: true };
}
