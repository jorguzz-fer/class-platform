"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { startCheckoutAction, type CheckoutState } from "@/lib/actions/checkout-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Processando..." : "Ir para o pagamento"}
    </Button>
  );
}

export function CheckoutForm({ courseId }: { courseId: string }) {
  const action = startCheckoutAction.bind(null, courseId);
  const [state, formAction] = useActionState<CheckoutState, FormData>(action, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="method">Forma de pagamento</Label>
        <select id="method" name="method" className={selectClass} defaultValue="PIX">
          <option value="PIX">PIX</option>
          <option value="CARD">Cartão de crédito</option>
          <option value="BOLETO">Boleto</option>
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="couponCode">Cupom (opcional)</Label>
        <Input id="couponCode" name="couponCode" placeholder="DESCONTO10" />
        {state?.fieldErrors?.couponCode && (
          <p className="text-sm text-destructive">{state.fieldErrors.couponCode[0]}</p>
        )}
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
