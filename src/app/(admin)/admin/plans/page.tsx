import { listPlans } from "@/services/admin.service";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function price(p: unknown, currency: string) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(Number(p ?? 0));
}

export default async function AdminPlansPage() {
  const plans = await listPlans();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Planos</h1>
        <p className="text-muted-foreground">Planos SaaS da plataforma.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.id}>
            <CardContent className="flex flex-col gap-3 py-6">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold">{plan.name}</span>
                <Badge variant="secondary">{plan._count.subscriptions} assinaturas</Badge>
              </div>
              <span className="text-2xl font-bold">
                {price(plan.price, plan.currency)}
                <span className="text-sm font-normal text-muted-foreground">
                  /{plan.billingCycle === "MONTHLY" ? "mês" : "ano"}
                </span>
              </span>
              <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
                <li>Cursos: {plan.maxCourses ?? "ilimitado"}</li>
                <li>Alunos: {plan.maxStudents ?? "ilimitado"}</li>
                <li>Admins: {plan.maxAdmins ?? "ilimitado"}</li>
                <li>Domínio próprio: {plan.hasCustomDomain ? "sim" : "não"}</li>
                <li>Certificados: {plan.hasCertificates ? "sim" : "não"}</li>
                <li>Analytics: {plan.hasAnalytics ? "sim" : "não"}</li>
                <li>IA: {plan.hasAiFeatures ? "sim" : "não"}</li>
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
