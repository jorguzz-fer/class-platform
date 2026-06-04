import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { requireOrg } from "@/lib/tenant";
import { can } from "@/lib/permissions";
import { db } from "@/lib/db";
import { getCohortReport } from "@/services/company.service";
import { listStudents } from "@/services/student.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { CohortAddStudent } from "@/components/dashboard/cohort-add-student";

export default async function CohortReportPage({
  params,
}: {
  params: Promise<{ cohortId: string }>;
}) {
  const { cohortId } = await params;
  const ctx = await requireOrg();
  if (!can(ctx.role, "org:view_reports")) redirect("/dashboard");

  const report = await getCohortReport(ctx.organizationId, cohortId);
  if (!report) notFound();

  // Alunos da escola que ainda não estão na turma.
  const cohort = await db.cohort.findFirst({
    where: { id: cohortId, organizationId: ctx.organizationId },
    select: { companyId: true },
  });
  const allStudents = await listStudents(ctx.organizationId);
  const inCohort = new Set(report.students.map((s) => s.studentId));
  const available = allStudents
    .filter((s) => !inCohort.has(s.id))
    .map((s) => ({ id: s.id, name: s.name }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          href={cohort ? `/dashboard/companies/${cohort.companyId}` : "/dashboard/companies"}
          className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar à empresa
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">{report.cohortName}</h1>
        <p className="text-muted-foreground">
          {report.companyName} • {report.courseTitle}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Progresso médio da turma</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <ProgressBar value={report.averageProgress} />
          <p className="text-sm text-muted-foreground">
            {report.averageProgress}% • {report.students.length} alunos •{" "}
            {report.requiredTotal} aulas obrigatórias
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Adicionar aluno à turma</CardTitle>
        </CardHeader>
        <CardContent>
          <CohortAddStudent cohortId={cohortId} students={available} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alunos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {report.students.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">
              Nenhum aluno na turma ainda.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Aluno</th>
                  <th className="px-4 py-3 font-medium">Progresso</th>
                  <th className="px-4 py-3 font-medium">Situação</th>
                </tr>
              </thead>
              <tbody>
                {report.students.map((s) => (
                  <tr key={s.studentId} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      {s.name}
                      <span className="block text-xs text-muted-foreground">{s.email}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ProgressBar value={s.percent} className="w-32" />
                        <span className="text-xs text-muted-foreground">{s.percent}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {s.completed ? (
                        <Badge variant="secondary">Concluído</Badge>
                      ) : (
                        <Badge variant="outline">Em andamento</Badge>
                      )}
                    </td>
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
