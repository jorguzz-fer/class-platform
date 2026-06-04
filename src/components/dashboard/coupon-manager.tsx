"use client";

import { useActionState, useEffect, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  createCouponAction,
  deleteCouponAction,
  type CouponState,
} from "@/lib/actions/coupon-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

type CouponView = {
  id: string;
  code: string;
  discountType: "PERCENT" | "FIXED";
  discountValue: string;
  redemptions: number;
  maxRedemptions: number | null;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Criando..." : "Criar cupom"}
    </Button>
  );
}

export function CouponManager({ coupons }: { coupons: CouponView[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [state, formAction] = useActionState<CouponState, FormData>(createCouponAction, null);

  useEffect(() => {
    if (state?.ok) {
      toast.success("Cupom criado.");
      router.refresh();
    } else if (state?.error) toast.error(state.error);
  }, [state, router]);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Novo cupom</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="grid gap-3 sm:grid-cols-4 sm:items-end">
            <div className="flex flex-col gap-2">
              <Label htmlFor="code">Código</Label>
              <Input id="code" name="code" placeholder="DESCONTO10" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="discountType">Tipo</Label>
              <select id="discountType" name="discountType" className={selectClass} defaultValue="PERCENT">
                <option value="PERCENT">Percentual (%)</option>
                <option value="FIXED">Valor fixo (R$)</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="discountValue">Valor</Label>
              <Input id="discountValue" name="discountValue" type="number" step="0.01" min="0" required />
            </div>
            <SubmitButton />
            {state?.fieldErrors?.code && (
              <p className="text-sm text-destructive sm:col-span-4">{state.fieldErrors.code[0]}</p>
            )}
          </form>
        </CardContent>
      </Card>

      {coupons.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Código</th>
                  <th className="px-4 py-3 font-medium">Desconto</th>
                  <th className="px-4 py-3 font-medium">Usos</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {coupons.map((c) => (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-mono">{c.code}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">
                        {c.discountType === "PERCENT"
                          ? `${Number(c.discountValue)}%`
                          : `R$ ${Number(c.discountValue).toFixed(2)}`}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {c.redemptions}
                      {c.maxRedemptions != null ? ` / ${c.maxRedemptions}` : ""}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={pending}
                        onClick={() => {
                          if (!confirm(`Remover o cupom ${c.code}?`)) return;
                          startTransition(async () => {
                            const result = await deleteCouponAction(c.id);
                            if (result?.error) toast.error(result.error);
                            else {
                              toast.success("Cupom removido.");
                              router.refresh();
                            }
                          });
                        }}
                      >
                        Remover
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
