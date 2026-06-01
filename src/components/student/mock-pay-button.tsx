"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { confirmMockPaymentAction } from "@/lib/actions/mock-pay-action";
import { Button } from "@/components/ui/button";

export function MockPayButton({ orderId }: { orderId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      className="w-full"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          // Sucesso redireciona; só tratamos erro.
          const result = await confirmMockPaymentAction(orderId);
          if (result?.error) toast.error(result.error);
        })
      }
    >
      {pending ? "Confirmando..." : "Confirmar pagamento (simulado)"}
    </Button>
  );
}
