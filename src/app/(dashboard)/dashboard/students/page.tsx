import Link from "next/link";
import { Plus, Users } from "lucide-react";

import { requireOrg } from "@/lib/tenant";
import { listStudents, getStudentOperations } from "@/services/student.service";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ListFilters } from "@/components/dashboard/list-filters";
import { StudentActiveToggle } from "@/components/dashboard/student-active-toggle";
import { formatCpf } from "@/lib/cpf";
import { cn } from "@/lib/utils";

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; operation?: string }>;
}) {
  const { organizationId } = await requireOrg();
  const { q = "", status = "", operation = "" } = await searchParams;
  const hasFilters = q.trim() !== "" || status !== "" || operation !== "";
  const [students, operations] = await Promise.all([
    listStudents(organizationId, { q, status, operation }),
    getStudentOperations(organizationId),
  ]);
  // Coluna/filtro de Operação só para escolas que usam operações (ex.: DCAS).
  const showOperation = operations.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Alunos</h1>
          <p className="text-muted-foreground">Gerencie os alunos da sua escola.</p>
        </div>
        <Link href="/dashboard/students/new" className={cn(buttonVariants(), "gap-2")}>
          <Plus className="h-4 w-4" />
          Novo aluno
        </Link>
      </div>

      <ListFilters
        q={q}
        status={status}
        searchPlaceholder="Buscar por nome ou e-mail…"
        statuses={[
          { value: "", label: "Todos" },
          { value: "active", label: "Ativo" },
          { value: "inactive", label: "Inativo" },
        ]}
        extra={
          showOperation
            ? {
                param: "operation",
                value: operation,
                label: "Filtrar por operação",
                options: [
                  { value: "", label: "Todas as operações" },
                  ...operations.map((op) => ({ value: op, label: op })),
                ],
              }
            : undefined
        }
      />

      {students.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Users className="h-10 w-10 text-muted-foreground" />
            {hasFilters ? (
              <>
                <p className="font-medium">Nenhum aluno encontrado</p>
                <p className="text-sm text-muted-foreground">
                  Tente outro termo de busca ou status.
                </p>
                <Link
                  href="/dashboard/students"
                  className={cn(buttonVariants({ variant: "outline" }), "mt-2")}
                >
                  Limpar filtros
                </Link>
              </>
            ) : (
              <>
                <p className="font-medium">Nenhum aluno ainda</p>
                <p className="text-sm text-muted-foreground">
                  Cadastre alunos para matriculá-los nos cursos.
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
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">CPF</th>
                  <th className="px-4 py-3 font-medium">E-mail</th>
                  {showOperation && (
                    <th className="px-4 py-3 font-medium">Operação</th>
                  )}
                  <th className="px-4 py-3 font-medium">Matrículas</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/students/${student.id}`}
                        className="font-medium hover:underline"
                      >
                        {student.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatCpf(student.cpf)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{student.email}</td>
                    {showOperation && (
                      <td className="px-4 py-3">
                        {student.operation ?? (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3">{student._count.enrollments}</td>
                    <td className="px-4 py-3">
                      <StudentActiveToggle
                        studentId={student.id}
                        isActive={student.isActive}
                      />
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
