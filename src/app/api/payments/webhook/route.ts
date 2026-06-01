import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { markOrderPaid } from "@/services/order.service";

/**
 * Webhook de confirmação de pagamento (Fase 2).
 *
 * Em produção, o gateway chama este endpoint quando o pagamento é confirmado.
 * Protegido por assinatura HMAC-SHA256 com PAYMENT_WEBHOOK_SECRET no header
 * X-Payment-Signature. Sem o secret configurado, a rota fica desabilitada (503).
 *
 * Confirmar o pagamento aqui libera o acesso (matrícula automática) de forma
 * idempotente — re-entregas do webhook não duplicam matrícula.
 */
const bodySchema = z.object({
  orderId: z.string().min(1),
  event: z.literal("payment.confirmed"),
});

function verifySignature(secret: string, rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  const expected = "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Webhook de pagamento não configurado." },
      { status: 503 },
    );
  }

  const rawBody = await req.text();
  if (!verifySignature(secret, rawBody, req.headers.get("x-payment-signature"))) {
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 401 });
  }

  let parsed;
  try {
    parsed = bodySchema.safeParse(JSON.parse(rawBody));
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }
  if (!parsed.success) {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const result = await markOrderPaid(parsed.data.orderId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json({ ok: true, alreadyPaid: result.alreadyPaid });
}
