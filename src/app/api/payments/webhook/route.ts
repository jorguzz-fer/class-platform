import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { getWebhookToken } from "@/services/payment-account.service";
import { markOrderPaid } from "@/services/order.service";

/**
 * Webhook de confirmação de pagamento — Asaas, POR TENANT.
 *
 * A Asaas chama este endpoint (URL única para todas as escolas) quando um
 * pagamento muda de estado. Cada escola configura, na própria conta Asaas, um
 * "Token de autenticação" que a Asaas envia no header `asaas-access-token`.
 *
 * Como resolvemos a escola: o `externalReference` da cobrança é o nosso
 * orderId; pelo pedido chegamos à organização e ao token dela, que comparamos
 * (timing-safe) com o header. Assim um token não vale para a escola errada.
 *
 * Confirmar o pagamento libera o acesso (matrícula automática) de forma
 * idempotente — re-entregas do webhook não duplicam matrícula.
 */

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  event: z.string(),
  payment: z.object({
    externalReference: z.string().min(1).nullable().optional(),
    status: z.string().optional(),
  }),
});

// Eventos/estados que significam "pago" (PIX/boleto recebido, cartão confirmado).
const PAID_EVENTS = new Set(["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"]);
const PAID_STATUSES = new Set(["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH"]);

function tokenMatches(expected: string, received: string | null): boolean {
  if (!received) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const raw = await req.text();
  let parsed;
  try {
    parsed = bodySchema.safeParse(JSON.parse(raw));
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }
  if (!parsed.success) {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const orderId = parsed.data.payment.externalReference;
  if (!orderId) {
    // Sem referência ao nosso pedido: nada a fazer, mas confirmamos o recebimento.
    return NextResponse.json({ ok: true, ignored: true });
  }

  const order = await db.order.findUnique({
    where: { id: orderId },
    select: { organizationId: true },
  });
  if (!order) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  // Valida o token da ESCOLA dona do pedido (isola entre tenants).
  const token = await getWebhookToken(order.organizationId);
  if (!token || !tokenMatches(token, req.headers.get("asaas-access-token"))) {
    return NextResponse.json({ error: "Token inválido." }, { status: 401 });
  }

  const isPaid =
    PAID_EVENTS.has(parsed.data.event) ||
    (parsed.data.payment.status
      ? PAID_STATUSES.has(parsed.data.payment.status)
      : false);

  if (!isPaid) {
    // Outro evento (criado, vencido, estornado…): apenas confirmamos.
    return NextResponse.json({ ok: true, handled: false });
  }

  const result = await markOrderPaid(orderId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ ok: true, alreadyPaid: result.alreadyPaid });
}
