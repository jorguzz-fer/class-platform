"use server";

import { revalidatePath } from "next/cache";

import { requireOrg } from "@/lib/tenant";
import { assertPermission } from "@/lib/permissions";
import { paymentSettingsSchema } from "@/lib/validators";
import { savePaymentAccount } from "@/services/payment-account.service";

export type PaymentSettingsState =
  | { ok?: boolean; error?: string; fieldErrors?: Record<string, string[]> }
  | null;

/** Salva a configuração de pagamentos (Asaas) da escola. */
export async function savePaymentSettingsAction(
  _prev: PaymentSettingsState,
  formData: FormData,
): Promise<PaymentSettingsState> {
  const ctx = await requireOrg();
  assertPermission(ctx.role, "org:manage_billing");

  const parsed = paymentSettingsSchema.safeParse({
    environment: formData.get("environment"),
    enabled: formData.get("enabled") === "on" || formData.get("enabled") === "true",
    apiKey: formData.get("apiKey") ?? undefined,
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const result = await savePaymentAccount(ctx.organizationId, {
    environment: parsed.data.environment,
    enabled: parsed.data.enabled,
    apiKey: parsed.data.apiKey || undefined,
  });
  if (!result.ok) return { error: result.error };

  revalidatePath("/dashboard/settings/payments");
  return { ok: true };
}
