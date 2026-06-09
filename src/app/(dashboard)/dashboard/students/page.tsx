import Link from "next/link";
import { Plus, Users } from "lucide-react";

import { requireOrg } from "@/lib/tenant";
import { listStudents } from "@/services/student.service";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default async function StudentsPage() {
  const { organizationId } = await requireOrg();
  const students = await listStudents(organizationId);

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

      {students.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Users className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">Nenhum aluno ainda</p>
            <p className="text-sm text-muted-foreground">
              Cadastre alunos para matriculá-los nos cursos.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">E-mail</th>
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
                    <td className="px-4 py-3 text-muted-foreground">{student.email}</td>
                    <td className="px-4 py-3">{student._count.enrollments}</td>
                    <td className="px-4 py-3">
                      {student.isActive ? (
                        <Badge variant="secondary">Ativo</Badge>
                      ) : (
                        <Badge variant="outline">Inativo</Badge>
                      )}
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
