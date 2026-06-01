"use server";

import { revalidatePath } from "next/cache";

import { requireOrg } from "@/lib/tenant";
import { assertPermission } from "@/lib/permissions";
import { createCouponSchema } from "@/lib/validators";
import { createCoupon, deleteCoupon } from "@/services/coupon.service";

export type CouponState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string[]> } | null;

export async function createCouponAction(
  _prev: CouponState,
  formData: FormData,
): Promise<CouponState> {
  const ctx = await requireOrg();
  assertPermission(ctx.role, "org:manage_billing");

  const parsed = createCouponSchema.safeParse({
    code: formData.get("code"),
    discountType: formData.get("discountType"),
    discountValue: formData.get("discountValue"),
    maxRedemptions: formData.get("maxRedemptions") || undefined,
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const result = await createCoupon(ctx.organizationId, {
    code: parsed.data.code,
    discountType: parsed.data.discountType,
    discountValue: parsed.data.discountValue,
    maxRedemptions: parsed.data.maxRedemptions ?? null,
  });
  if (!result.ok) return { error: result.error };

  revalidatePath("/dashboard/sales");
  return { ok: true };
}

export async function deleteCouponAction(couponId: string): Promise<CouponState> {
  const ctx = await requireOrg();
  assertPermission(ctx.role, "org:manage_billing");

  const ok = await deleteCoupon(ctx.organizationId, couponId);
  if (!ok) return { error: "Cupom não encontrado." };

  revalidatePath("/dashboard/sales");
  return { ok: true };
}
