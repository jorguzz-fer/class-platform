import Link from "next/link";
import { GraduationCap } from "lucide-react";

import { requireOrg } from "@/lib/tenant";
import {
  listEnrollments,
  listPendingEnrollments,
} from "@/services/enrollment.service";
import { Card, CardContent } from "@/components/ui/card";
import { EnrollmentStatusBadge } from "@/components/dashboard/enrollment-status-badge";
import { PendingEnrollmentActions } from "@/components/dashboard/pending-enrollment-actions";
import { ListFilters } from "@/components/dashboard/list-filters";

export default async function EnrollmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { organizationId } = await requireOrg();
  const { q = "", status = "" } = await searchParams;
  const hasFilters = q.trim() !== "" || status !== "";
  const [enrollments, pending] = await Promise.all([
    listEnrollments(organizationId, { q, status }),
    listPendingEnrollments(organizationId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Matrículas</h1>
        <p className="text-muted-foreground">
          Todas as matrículas da sua escola.
        </p>
      </div>

      {pending.length > 0 && (
        <Card className="border-primary/40">
          <CardContent className="overflow-x-auto p-0">
            <div className="border-b px-4 py-3">
              <h2 className="font-semibold">
                Solicitações pendentes ({pending.length})
              </h2>
              <p className="text-sm text-muted-foreground">
                Alunos que pediram acesso por link e aguardam sua aprovação.
              </p>
            </div>
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Aluno</th>
                  <th className="px-4 py-3 font-medium">Curso</th>
                  <th className="px-4 py-3 font-medium">Solicitado em</th>
                  <th className="px-4 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((e) => (
                  <tr key={e.id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <div className="font-medium">{e.student.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {e.student.email}
                      </div>
                    </td>
                    <td className="px-4 py-3">{e.course.title}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {e.enrolledAt.toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3">
                      <PendingEnrollmentActions enrollmentId={e.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <ListFilters
        q={q}
        status={status}
        searchPlaceholder="Buscar por aluno ou curso…"
        statuses={[
          { value: "", label: "Todos os status" },
          { value: "ACTIVE", label: "Ativa" },
          { value: "COMPLETED", label: "Concluída" },
          { value: "EXPIRED", label: "Expirada" },
          { value: "CANCELED", label: "Cancelada" },
        ]}
      />

      {enrollments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <GraduationCap className="h-10 w-10 text-muted-foreground" />
            {hasFilters ? (
              <>
                <p className="font-medium">Nenhuma matrícula encontrada</p>
                <p className="text-sm text-muted-foreground">
                  Tente outro termo de busca ou status.
                </p>
                <Link
                  href="/dashboard/enrollments"
                  className="mt-2 text-sm text-primary hover:underline"
                >
                  Limpar filtros
                </Link>
              </>
            ) : (
              <>
                <p className="font-medium">Nenhuma matrícula ainda</p>
                <p className="text-sm text-muted-foreground">
                  Matricule alunos pela página de cada aluno.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[640px] text-sm">
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
