"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  addManagerAction,
  createCohortAction,
  type CompanyState,
} from "@/lib/actions/company-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

type Manager = { id: string; user: { name: string; email: string } };
type Cohort = { id: string; name: string; courseTitle: string; members: number };

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "..." : label}
    </Button>
  );
}

export function CompanyDetail({
  companyId,
  managers,
  cohorts,
  courses,
}: {
  companyId: string;
  managers: Manager[];
  cohorts: Cohort[];
  courses: { id: string; title: string }[];
}) {
  const router = useRouter();

  const addManager = addManagerAction.bind(null, companyId);
  const [mgrState, mgrAction] = useActionState<CompanyState, FormData>(addManager, null);
  useEffect(() => {
    if (mgrState?.ok) {
      toast.success("Gestor adicionado.");
      router.refresh();
    } else if (mgrState?.error) toast.error(mgrState.error);
  }, [mgrState, router]);

  const addCohort = createCohortAction.bind(null, companyId);
  const [cohState, cohAction] = useActionState<CompanyState, FormData>(addCohort, null);
  useEffect(() => {
    if (cohState?.ok) {
      toast.success("Turma criada.");
      router.refresh();
    } else if (cohState?.error) toast.error(cohState.error);
  }, [cohState, router]);

  return (
    <div className="flex flex-col gap-6">
      {/* Gestores */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gestores</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form action={mgrAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="mgr-name">Nome</Label>
              <Input id="mgr-name" name="name" required />
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="mgr-email">E-mail</Label>
              <Input id="mgr-email" name="email" type="email" required />
            </div>
            <Submit label="Adicionar gestor" />
          </form>
          {managers.length > 0 && (
            <ul className="flex flex-col gap-1 text-sm">
              {managers.map((m) => (
                <li key={m.id} className="flex items-center justify-between border-b py-2 last:border-0">
                  <span>
                    {m.user.name} <span className="text-muted-foreground">({m.user.email})</span>
                  </span>
                  <Badge variant="secondary">Gestor</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Turmas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Turmas corporativas</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {courses.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Crie e publique cursos para montar turmas.
            </p>
          ) : (
            <form action={cohAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex flex-1 flex-col gap-2">
                <Label htmlFor="coh-name">Nome da turma</Label>
                <Input id="coh-name" name="name" placeholder="Turma 2026.1" required />
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <Label htmlFor="coh-course">Curso</Label>
                <select id="coh-course" name="courseId" className={selectClass} defaultValue="">
                  <option value="" disabled>
                    Selecione
                  </option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
              <Submit label="Criar turma" />
            </form>
          )}

          {cohorts.length > 0 && (
            <table className="w-full text-sm">
              <thead className="border-b text-left text-muted-foreground">
                <tr>
                  <th className="py-2 font-medium">Turma</th>
                  <th className="py-2 font-medium">Curso</th>
                  <th className="py-2 font-medium">Alunos</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {cohorts.map((c) => (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="py-2">{c.name}</td>
                    <td className="py-2 text-muted-foreground">{c.courseTitle}</td>
                    <td className="py-2">{c.members}</td>
                    <td className="py-2 text-right">
                      <Link
                        href={`/dashboard/companies/cohorts/${c.id}`}
                        className="text-primary hover:underline"
                      >
                        Relatório
                      </Link>
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
