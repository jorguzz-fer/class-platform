import { Building2, Users, BookOpen, GraduationCap, Award, Activity } from "lucide-react";

import { getGlobalMetrics } from "@/services/admin.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminMetricsPage() {
  const m = await getGlobalMetrics();

  const stats = [
    { label: "Organizações", value: m.orgs, icon: Building2 },
    { label: "Orgs ativas", value: m.activeOrgs, icon: Activity },
    { label: "Orgs em trial", value: m.trialOrgs, icon: Activity },
    { label: "Usuários", value: m.users, icon: Users },
    { label: "Cursos", value: m.courses, icon: BookOpen },
    { label: "Matrículas", value: m.enrollments, icon: GraduationCap },
    { label: "Certificados", value: m.certificates, icon: Award },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Métricas globais</h1>
        <p className="text-muted-foreground">Visão geral da plataforma.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {s.label}
              </CardTitle>
              <s.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
