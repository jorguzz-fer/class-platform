"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireOrg } from "@/lib/tenant";
import { checkoutSchema } from "@/lib/validators";
import { createOrder } from "@/services/order.service";

export type CheckoutState = { error?: string; fieldErrors?: Record<string, string[]> } | null;

/**
 * Inicia o checkout de um curso para o usuário logado: cria o pedido e
 * redireciona para a URL de pagamento (mock: página interna de confirmação).
 */
export async function startCheckoutAction(
  courseId: string,
  _prev: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const ctx = await requireOrg();

  const parsed = checkoutSchema.safeParse({
    method: formData.get("method"),
    couponCode: formData.get("couponCode"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const result = await createOrder(ctx.organizationId, ctx.userId, courseId, {
    couponCode: parsed.data.couponCode || null,
    method: parsed.data.method,
  });
  if (!result.ok) return { error: result.error };

  revalidatePath("/app");
  redirect(result.checkoutUrl);
}
