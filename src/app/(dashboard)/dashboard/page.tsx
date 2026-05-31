import { BookOpen, Users, GraduationCap, Award, CheckCircle2, Eye } from "lucide-react";

import { requireOrg } from "@/lib/tenant";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  const { organizationId } = await requireOrg();
  const where = { organizationId };

  const [
    totalCourses,
    publishedCourses,
    totalStudents,
    activeEnrollments,
    completedEnrollments,
    totalEnrollments,
  ] = await Promise.all([
    db.course.count({ where }),
    db.course.count({ where: { ...where, status: "PUBLISHED" } }),
    db.organizationMember.count({ where: { ...where, role: "STUDENT" } }),
    db.enrollment.count({ where: { ...where, status: "ACTIVE" } }),
    db.enrollment.count({ where: { ...where, status: "COMPLETED" } }),
    db.enrollment.count({ where }),
  ]);

  const completionRate =
    totalEnrollments > 0
      ? Math.round((completedEnrollments / totalEnrollments) * 100)
      : 0;

  const stats = [
    { label: "Alunos", value: totalStudents, icon: Users },
    { label: "Cursos", value: totalCourses, icon: BookOpen },
    { label: "Cursos publicados", value: publishedCourses, icon: Eye },
    { label: "Matrículas ativas", value: activeEnrollments, icon: GraduationCap },
    { label: "Matrículas concluídas", value: completedEnrollments, icon: CheckCircle2 },
    { label: "Taxa de conclusão", value: `${completionRate}%`, icon: Award },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral da sua escola.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
