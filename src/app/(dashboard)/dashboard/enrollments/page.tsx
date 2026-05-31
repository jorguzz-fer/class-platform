import Link from "next/link";
import { GraduationCap } from "lucide-react";

import { requireOrg } from "@/lib/tenant";
import { listEnrollments } from "@/services/enrollment.service";
import { Card, CardContent } from "@/components/ui/card";
import { EnrollmentStatusBadge } from "@/components/dashboard/enrollment-status-badge";

export default async function EnrollmentsPage() {
  const { organizationId } = await requireOrg();
  const enrollments = await listEnrollments(organizationId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Matrículas</h1>
        <p className="text-muted-foreground">
          Todas as matrículas da sua escola.
        </p>
      </div>

      {enrollments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <GraduationCap className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">Nenhuma matrícula ainda</p>
            <p className="text-sm text-muted-foreground">
              Matricule alunos pela página de cada aluno.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Aluno</th>
                  <th className="px-4 py-3 font-medium">Curso</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Matriculado em</th>
                </tr>
              </thead>
              <tbody>
                {enrollments.map((e) => (
                  <tr key={e.id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/students/${e.student.id}`}
                        className="font-medium hover:underline"
                      >
                        {e.student.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{e.course.title}</td>
                    <td className="px-4 py-3">
                      <EnrollmentStatusBadge status={e.status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {e.enrolledAt.toLocaleDateString("pt-BR")}
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
