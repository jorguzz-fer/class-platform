import { redirect } from "next/navigation";

import { requireOrg } from "@/lib/tenant";
import { can } from "@/lib/permissions";
import { db } from "@/lib/db";
import { getOrgPlan } from "@/services/school.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function formatPrice(price: unknown, currency: string) {
  const value = Number(price ?? 0);
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(value);
}

export default async function BillingPage() {
  const ctx = await requireOrg();
  if (!can(ctx.role, "org:manage_billing")) redirect("/dashboard");

  const [org, plan, usage] = await Promise.all([
    db.organization.findUnique({
      where: { id: ctx.organizationId },
      select: { status: true, subscriptionStatus: true, trialEndsAt: true },
    }),
    getOrgPlan(ctx.organizationId),
    Promise.all([
      db.course.count({ where: { organizationId: ctx.organizationId } }),
      db.organizationMember.count({
        where: { organizationId: ctx.organizationId, role: "STUDENT" },
      }),
    ]),
  ]);

  const [courseCount, studentCount] = usage;

  const limits = [
    { label: "Cursos", used: courseCount, max: plan?.maxCourses ?? null },
    { label: "Alunos", used: studentCount, max: plan?.maxStudents ?? null },
    { label: "Administradores", used: undefined, max: plan?.maxAdmins ?? null },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cobrança</h1>
        <p className="text-muted-foreground">Seu plano e uso atual.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Plano atual</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold">{plan?.name ?? "—"}</span>
            {plan && (
              <span className="text-muted-foreground">
                {formatPrice(plan.price, plan.currency)}/
                {plan.billingCycle === "MONTHLY" ? "mês" : "ano"}
              </span>
            )}
            <Badge variant={org?.subscriptionStatus === "ACTIVE" ? "default" : "secondary"}>
              {org?.subscriptionStatus ?? "—"}
            </Badge>
          </div>
          {org?.status === "TRIAL" && org.trialEndsAt && (
            <p className="text-sm text-muted-foreground">
              Período de teste até {org.trialEndsAt.toLocaleDateString("pt-BR")}.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            O upgrade de plano e o pagamento serão habilitados em breve.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Uso</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          {limits.map((l) => (
            <div key={l.label} className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground">{l.label}</span>
              <span className="text-xl font-semibold">
                {l.used ?? "—"}
                {l.max != null && (
                  <span className="text-sm font-normal text-muted-foreground">
                    {" "}
                    / {l.max}
                  </span>
                )}
                {l.max == null && (
                  <span className="text-sm font-normal text-muted-foreground"> (ilimitado)</span>
                )}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
