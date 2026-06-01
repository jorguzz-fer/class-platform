import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { paymentProvider } from "@/lib/payment";
import { enrollStudent } from "@/services/enrollment.service";
import { onEnrollmentCreated } from "@/services/events.service";

/**
 * Serviço de pedidos/checkout (Fase 2). Escopado por organizationId.
 *
 * Fluxo: aplicar cupom -> calcular valor -> criar Order(PENDING) -> sessão de
 * pagamento. A confirmação (markOrderPaid) libera o acesso (matrícula) e dispara
 * o evento de matrícula (notificação + webhook da Fase 5). Idempotente.
 */

function toNumber(d: Prisma.Decimal | null | undefined): number {
  return d == null ? 0 : Number(d);
}

export type PriceQuote = {
  basePrice: number;
  discount: number;
  finalAmount: number;
  couponId: string | null;
  currency: string;
};

/** Calcula o preço final de um curso aplicando um cupom opcional. */
export async function quotePrice(
  organizationId: string,
  courseId: string,
  couponCode?: string | null,
): Promise<{ ok: true; quote: PriceQuote } | { ok: false; error: string }> {
  const course = await db.course.findFirst({
    where: { id: courseId, organizationId, status: "PUBLISHED" },
    select: { price: true, currency: true },
  });
  if (!course) return { ok: false, error: "Curso não disponível." };

  const basePrice = toNumber(course.price);
  let discount = 0;
  let couponId: string | null = null;

  if (couponCode) {
    const coupon = await db.coupon.findFirst({
      where: { organizationId, code: couponCode, isActive: true },
    });
    if (!coupon) return { ok: false, error: "Cupom inválido." };
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return { ok: false, error: "Cupom expirado." };
    }
    if (coupon.maxRedemptions != null && coupon.redemptions >= coupon.maxRedemptions) {
      return { ok: false, error: "Cupom esgotado." };
    }
    const value = toNumber(coupon.discountValue);
    discount =
      coupon.discountType === "PERCENT"
        ? Math.round(basePrice * (value / 100) * 100) / 100
        : Math.min(value, basePrice);
    couponId = coupon.id;
  }

  const finalAmount = Math.max(0, Math.round((basePrice - discount) * 100) / 100);
  return {
    ok: true,
    quote: { basePrice, discount, finalAmount, couponId, currency: course.currency },
  };
}

export type CreateOrderResult =
  | { ok: true; orderId: string; checkoutUrl: string; finalAmount: number }
  | { ok: false; error: string };

/**
 * Cria um pedido para o comprador (usuário logado) e uma sessão de pagamento.
 * Bloqueia se o comprador já está matriculado no curso.
 */
export async function createOrder(
  organizationId: string,
  buyerId: string,
  courseId: string,
  input: { couponCode?: string | null; method: "PIX" | "CARD" | "BOLETO" },
): Promise<CreateOrderResult> {
  const already = await db.enrollment.findUnique({
    where: { courseId_studentId: { courseId, studentId: buyerId } },
    select: { id: true },
  });
  if (already) return { ok: false, error: "Você já tem acesso a este curso." };

  const quoted = await quotePrice(organizationId, courseId, input.couponCode);
  if (!quoted.ok) return { ok: false, error: quoted.error };

  const course = await db.course.findFirst({
    where: { id: courseId, organizationId },
    select: { title: true },
  });
  if (!course) return { ok: false, error: "Curso não encontrado." };

  const order = await db.order.create({
    data: {
      organizationId,
      courseId,
      buyerId,
      couponId: quoted.quote.couponId,
      amount: new Prisma.Decimal(quoted.quote.finalAmount),
      currency: quoted.quote.currency,
      paymentMethod: input.method,
      status: "PENDING",
    },
  });

  const session = await paymentProvider.createCheckoutSession({
    orderId: order.id,
    amount: quoted.quote.finalAmount,
    currency: quoted.quote.currency,
    method: input.method,
    description: course.title,
  });

  await db.order.update({
    where: { id: order.id },
    data: { gatewayProvider: paymentProvider.name, gatewayRef: session.gatewayRef },
  });

  return {
    ok: true,
    orderId: order.id,
    checkoutUrl: session.checkoutUrl,
    finalAmount: quoted.quote.finalAmount,
  };
}

export type MarkPaidResult =
  | { ok: true; alreadyPaid: boolean }
  | { ok: false; error: string };

/**
 * Confirma o pagamento de um pedido e LIBERA O ACESSO (matrícula automática).
 * Idempotente: se já estava pago, não duplica matrícula nem incrementa cupom.
 */
export async function markOrderPaid(orderId: string): Promise<MarkPaidResult> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      organizationId: true,
      courseId: true,
      buyerId: true,
      couponId: true,
      status: true,
    },
  });
  if (!order) return { ok: false, error: "Pedido não encontrado." };
  if (order.status === "PAID") return { ok: true, alreadyPaid: true };

  await db.order.update({
    where: { id: orderId },
    data: { status: "PAID", paidAt: new Date() },
  });

  // Incrementa uso do cupom, se houver.
  if (order.couponId) {
    await db.coupon.update({
      where: { id: order.couponId },
      data: { redemptions: { increment: 1 } },
    });
  }

  // Libera o acesso: matrícula automática + evento (notificação/webhook).
  const enrolled = await enrollStudent(order.organizationId, order.buyerId, order.courseId);
  if (enrolled.ok) {
    await onEnrollmentCreated(order.organizationId, order.buyerId, order.courseId);
  }

  return { ok: true, alreadyPaid: false };
}

export function listOrders(organizationId: string) {
  return db.order.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    include: {
      course: { select: { title: true } },
      buyer: { select: { name: true, email: true } },
    },
    take: 100,
  });
}

export function getOrder(orderId: string, buyerId: string) {
  return db.order.findFirst({
    where: { id: orderId, buyerId },
    include: { course: { select: { title: true, slug: true } } },
  });
}
