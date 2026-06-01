import { Prisma, type DiscountType } from "@prisma/client";

import { db } from "@/lib/db";

/** Serviço de cupons (Fase 2). Escopado por organizationId. */

export function listCoupons(organizationId: string) {
  return db.coupon.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
  });
}

export type CreateCouponResult =
  | { ok: true; couponId: string }
  | { ok: false; error: string };

export async function createCoupon(
  organizationId: string,
  input: {
    code: string;
    discountType: DiscountType;
    discountValue: number;
    maxRedemptions?: number | null;
  },
): Promise<CreateCouponResult> {
  if (input.discountType === "PERCENT" && (input.discountValue <= 0 || input.discountValue > 100)) {
    return { ok: false, error: "Percentual deve estar entre 1 e 100." };
  }
  if (input.discountValue <= 0) {
    return { ok: false, error: "Valor do desconto inválido." };
  }

  const existing = await db.coupon.findFirst({
    where: { organizationId, code: input.code },
    select: { id: true },
  });
  if (existing) return { ok: false, error: "Já existe um cupom com este código." };

  const coupon = await db.coupon.create({
    data: {
      organizationId,
      code: input.code,
      discountType: input.discountType,
      discountValue: new Prisma.Decimal(input.discountValue),
      maxRedemptions: input.maxRedemptions ?? null,
    },
  });
  return { ok: true, couponId: coupon.id };
}

export async function deleteCoupon(organizationId: string, couponId: string) {
  const result = await db.coupon.deleteMany({
    where: { id: couponId, organizationId },
  });
  return result.count > 0;
}
