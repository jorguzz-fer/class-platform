"use server";

import { redirect } from "next/navigation";

import { requireOrg } from "@/lib/tenant";
import { db } from "@/lib/db";
import { markOrderPaid } from "@/services/order.service";
import { isMockPaymentAllowed } from "@/lib/payment";

/**
 * Confirmação de pagamento SIMULADA (provider mock). Só funciona quando NENHUM
 * sinal de pagamento real está configurado (fail-closed) — em produção, a
 * confirmação vem pelo webhook do gateway, não por esta ação.
 *
 * Valida que o pedido pertence ao comprador logado antes de liberar acesso.
 */
export async function confirmMockPaymentAction(orderId: string): Promise<{ error: string } | void> {
  if (!isMockPaymentAllowed()) {
    return { error: "Confirmação simulada desabilitada: use o gateway de pagamento." };
  }

  const ctx = await requireOrg();
  const order = await db.order.findFirst({
    where: { id: orderId, buyerId: ctx.userId, organizationId: ctx.organizationId },
    select: { id: true, course: { select: { slug: true } } },
  });
  if (!order) return { error: "Pedido não encontrado." };

  const result = await markOrderPaid(orderId);
  if (!result.ok) return { error: result.error };

  redirect(`/app/courses/${order.course.slug}`);
}
