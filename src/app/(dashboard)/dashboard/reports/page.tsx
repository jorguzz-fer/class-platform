import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Clock,
  GraduationCap,
  CheckCircle2,
  XCircle,
  BarChart3,
} from "lucide-react";

import { requireOrg } from "@/lib/tenant";
import { can } from "@/lib/permissions";
import {
  getEnrollmentBreakdown,
  getCourseReport,
} from "@/services/metrics.service";
import { getCourseRatingsByOrg } from "@/services/rating.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CourseStatusBadge } from "@/components/dashboard/course-status-badge";

export default async function ReportsPage() {
  const ctx = await requireOrg();
  if (!can(ctx.role, "org:view_reports")) redirect("/dashboard");

  const [breakdown, courses, ratings] = await Promise.all([
    getEnrollmentBreakdown(ctx.organizationId),
    getCourseReport(ctx.organizationId),
    getCourseRatingsByOrg(ctx.organizationId),
  ]);

  const cards = [
    { label: "Solicitações pendentes", value: breakdown.pending, icon: Clock },
    { label: "Matrículas ativas", value: breakdown.active, icon: GraduationCap },
    { label: "Concluídas", value: breakdown.completed, icon: CheckCircle2 },
    { label: "Canceladas", value: breakdown.canceled, icon: XCircle },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>
        <p className="text-muted-foreground">
          Matrículas e desempenho dos cursos da sua escola.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Desempenho por curso</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {courses.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">
              <BarChart3 className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              Nenhum curso ainda.{" "}
              <Link
                href="/dashboard/courses/new"
                className="text-primary hover:underline"
              >
                Criar curso
              </Link>
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="border-b text-left text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Curso</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Conteúdo</th>
                    <th className="px-4 py-3 text-right font-medium">Matrículas</th>
                    <th className="px-4 py-3 text-right font-medium">Ativas</th>
                    <th className="px-4 py-3 text-right font-medium">Concluídas</th>
                    <th className="px-4 py-3 text-right font-medium">Pendentes</th>
                    <th className="px-4 py-3 text-right font-medium">Conclusão</th>
                    <th className="px-4 py-3 text-right font-medium">Nota</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((course) => (
                    <tr
                      key={course.id}
                      className="border-b last:border-0 hover:bg-muted/40"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/courses/${course.id}`}
                          className="font-medium hover:underline"
                        >
                          {course.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <CourseStatusBadge status={course.status} />
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {course.modules} mód. · {course.lessons} aulas
                      </td>
                      <td className="px-4 py-3 text-right">{course.total}</td>
                      <td className="px-4 py-3 text-right">{course.active}</td>
                      <td className="px-4 py-3 text-right">{course.completed}</td>
                      <td className="px-4 py-3 text-right">
                        {course.pending > 0 ? (
                          <span className="font-medium text-primary">
                            {course.pending}
                          </span>
                        ) : (
                          0
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {course.completionRate}%
                      </td>
                      <td className="px-4 py-3 text-right">
                        {(() => {
                          const r = ratings.get(course.id);
                          return r && r.count > 0
                            ? `★ ${r.average} (${r.count})`
                            : "—";
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
