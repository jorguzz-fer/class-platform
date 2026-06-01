import { redirect } from "next/navigation";

import { requireOrg } from "@/lib/tenant";
import { can } from "@/lib/permissions";
import { listOrders } from "@/services/order.service";
import { listCoupons } from "@/services/coupon.service";
import { CouponManager } from "@/components/dashboard/coupon-manager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function money(amount: unknown, currency: string) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(Number(amount ?? 0));
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  PAID: "default",
  PENDING: "secondary",
  FAILED: "destructive",
  REFUNDED: "outline",
  CANCELED: "outline",
};

export default async function SalesPage() {
  const ctx = await requireOrg();
  if (!can(ctx.role, "org:manage_billing")) redirect("/dashboard");

  const [orders, coupons] = await Promise.all([
    listOrders(ctx.organizationId),
    listCoupons(ctx.organizationId),
  ]);

  const revenue = orders
    .filter((o) => o.status === "PAID")
    .reduce((sum, o) => sum + Number(o.amount), 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Vendas</h1>
        <p className="text-muted-foreground">Pedidos, receita e cupons de desconto.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Receita</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{money(revenue, "BRL")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pedidos pagos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {orders.filter((o) => o.status === "PAID").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de pedidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.length}</div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Cupons</h2>
        <CouponManager
          coupons={coupons.map((c) => ({
            id: c.id,
            code: c.code,
            discountType: c.discountType,
            discountValue: c.discountValue.toString(),
            redemptions: c.redemptions,
            maxRedemptions: c.maxRedemptions,
          }))}
        />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Pedidos</h2>
        <Card>
          <CardContent className="p-0">
            {orders.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-muted-foreground">
                Nenhum pedido ainda.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b text-left text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Comprador</th>
                    <th className="px-4 py-3 font-medium">Curso</th>
                    <th className="px-4 py-3 font-medium">Valor</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className="border-b last:border-0">
                      <td className="px-4 py-3">{o.buyer.name}</td>
                      <td className="px-4 py-3">{o.course.title}</td>
                      <td className="px-4 py-3">{money(o.amount, o.currency)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_VARIANT[o.status] ?? "secondary"}>{o.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {o.createdAt.toLocaleDateString("pt-BR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
