import { notFound } from "next/navigation";
import { CreditCard } from "lucide-react";

import { requireOrg } from "@/lib/tenant";
import { getOrder } from "@/services/order.service";
import { isMockPaymentAllowed } from "@/lib/payment";
import { MockPayButton } from "@/components/student/mock-pay-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatMoney(amount: unknown, currency: string) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(Number(amount ?? 0));
}

/**
 * Página de pagamento SIMULADA (provider mock). Em produção (gateway real), o
 * comprador seria redirecionado ao checkout do gateway e a confirmação chegaria
 * via webhook — esta página não estaria neste fluxo.
 */
export default async function MockPayPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const ctx = await requireOrg();
  const order = await getOrder(orderId, ctx.userId);
  if (!order) notFound();

  const mockAllowed = isMockPaymentAllowed();

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Pagamento
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">{order.course.title}</span>
            <span className="text-2xl font-bold">
              {formatMoney(order.amount, order.currency)}
            </span>
            <span className="text-xs text-muted-foreground">
              Método: {order.paymentMethod} • Status: {order.status}
            </span>
          </div>

          {order.status === "PAID" ? (
            <p className="text-sm text-primary">Pagamento confirmado. Acesso liberado!</p>
          ) : mockAllowed ? (
            <>
              <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
                Ambiente de demonstração: nenhum pagamento real é processado.
                Confirme para simular a aprovação e liberar o acesso.
              </p>
              <MockPayButton orderId={orderId} />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Você seria redirecionado ao gateway de pagamento.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
