import { createHmac, randomBytes } from "node:crypto";

import { db } from "@/lib/db";

/**
 * Serviço de webhooks de saída (Fase 5). Escolas configuram endpoints (ex.: um
 * fluxo n8n) para receber eventos de domínio. Cada entrega é assinada com
 * HMAC-SHA256 usando o segredo do webhook, permitindo ao receptor validar a
 * autenticidade. Tudo escopado por organizationId.
 */

/** Tipos de evento suportados (mantém o conjunto enxuto e explícito). */
export const WEBHOOK_EVENTS = [
  "enrollment.created",
  "course.published",
  "certificate.issued",
  "student.created",
] as const;
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export function listWebhooks(organizationId: string) {
  return db.webhook.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { deliveries: true } } },
  });
}

export async function createWebhook(
  organizationId: string,
  url: string,
  events: string[],
) {
  // Segredo gerado no servidor; o receptor usa para validar a assinatura.
  const secret = "whsec_" + randomBytes(24).toString("hex");
  const valid = events.filter((e) =>
    (WEBHOOK_EVENTS as readonly string[]).includes(e),
  );
  return db.webhook.create({
    data: { organizationId, url, secret, events: valid },
  });
}

export async function deleteWebhook(organizationId: string, webhookId: string) {
  const result = await db.webhook.deleteMany({
    where: { id: webhookId, organizationId },
  });
  return result.count > 0;
}

export function signPayload(secret: string, body: string): string {
  return "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
}

/**
 * Dispara um evento para todos os webhooks ativos da organização inscritos nele.
 * Best-effort: cada entrega é registrada (WebhookDelivery) e uma falha não
 * impede as demais nem quebra o fluxo de quem chamou.
 */
export async function dispatchEvent(
  organizationId: string,
  event: WebhookEvent,
  payload: Record<string, unknown>,
): Promise<void> {
  const webhooks = await db.webhook.findMany({
    where: { organizationId, isActive: true, events: { has: event } },
  });
  if (webhooks.length === 0) return;

  const body = JSON.stringify({
    event,
    organizationId,
    data: payload,
    timestamp: new Date().toISOString(),
  });

  await Promise.all(
    webhooks.map(async (webhook) => {
      const delivery = await db.webhookDelivery.create({
        data: { webhookId: webhook.id, event, payload: payload as object },
      });
      try {
        const res = await fetch(webhook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-ClassOS-Event": event,
            "X-ClassOS-Signature": signPayload(webhook.secret, body),
          },
          body,
          signal: AbortSignal.timeout(10_000),
        });
        await db.webhookDelivery.update({
          where: { id: delivery.id },
          data: {
            status: res.ok ? "SENT" : "FAILED",
            statusCode: res.status,
            attempts: 1,
            deliveredAt: res.ok ? new Date() : null,
            lastError: res.ok ? null : `HTTP ${res.status}`,
          },
        });
      } catch (e) {
        await db.webhookDelivery.update({
          where: { id: delivery.id },
          data: {
            status: "FAILED",
            attempts: 1,
            lastError: e instanceof Error ? e.message : "erro de rede",
          },
        });
      }
    }),
  );
}
