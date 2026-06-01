"use server";

import { redirect } from "next/navigation";

import { requireOrg } from "@/lib/tenant";
import { db } from "@/lib/db";
import { markOrderPaid } from "@/services/order.service";

/**
 * Confirmação de pagamento SIMULADA (provider mock). Só funciona quando o
 * provider real NÃO está configurado (PAYMENT_PROVIDER ausente) — em produção,
 * a confirmação vem pelo webhook do gateway, não por esta ação.
 *
 * Valida que o pedido pertence ao comprador logado antes de liberar acesso.
 */
export async function confirmMockPaymentAction(orderId: string): Promise<{ error: string } | void> {
  if (process.env.PAYMENT_PROVIDER) {
    return { error: "Pagamento real configurado: use o gateway." };
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
