import Link from "next/link";
import {
  BookOpen,
  Users,
  GraduationCap,
  Award,
  CheckCircle2,
  Eye,
  Activity,
} from "lucide-react";

import { requireOrg } from "@/lib/tenant";
import { getSchoolMetrics, getRecentCourses } from "@/services/metrics.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CourseStatusBadge } from "@/components/dashboard/course-status-badge";

export default async function DashboardPage() {
  const { organizationId } = await requireOrg();
  const [metrics, recentCourses] = await Promise.all([
    getSchoolMetrics(organizationId),
    getRecentCourses(organizationId),
  ]);

  const stats = [
    { label: "Alunos", value: metrics.totalStudents, icon: Users },
    { label: "Alunos ativos (7 dias)", value: metrics.activeStudents7d, icon: Activity },
    { label: "Cursos", value: metrics.totalCourses, icon: BookOpen },
    { label: "Cursos publicados", value: metrics.publishedCourses, icon: Eye },
    { label: "Matrículas ativas", value: metrics.activeEnrollments, icon: GraduationCap },
    { label: "Matrículas concluídas", value: metrics.completedEnrollments, icon: CheckCircle2 },
    { label: "Taxa de conclusão", value: `${metrics.completionRate}%`, icon: Activity },
    { label: "Certificados emitidos", value: metrics.certificatesIssued, icon: Award },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral da sua escola.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cursos recentes</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {recentCourses.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">
              Nenhum curso ainda.{" "}
              <Link href="/dashboard/courses/new" className="text-primary hover:underline">
                Criar curso
              </Link>
            </p>
          ) : (
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Curso</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Matrículas</th>
                </tr>
              </thead>
              <tbody>
                {recentCourses.map((course) => (
                  <tr key={course.id} className="border-b last:border-0 hover:bg-muted/40">
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
                    <td className="px-4 py-3">{course._count.enrollments}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
