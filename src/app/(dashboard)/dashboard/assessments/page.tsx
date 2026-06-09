import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardCheck } from "lucide-react";

import { requireOrg } from "@/lib/tenant";
import { can } from "@/lib/permissions";
import { listPendingAttempts } from "@/services/quiz.service";
import { Card, CardContent } from "@/components/ui/card";

export default async function AssessmentsPage() {
  const ctx = await requireOrg();
  if (!can(ctx.role, "course:edit")) redirect("/dashboard");

  const pending = await listPendingAttempts(ctx.organizationId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Correções</h1>
        <p className="text-muted-foreground">
          Provas com questões dissertativas aguardando sua correção.
        </p>
      </div>

      {pending.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
            <ClipboardCheck className="h-8 w-8" />
            <p>Nenhuma prova aguardando correção.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {pending.map((a) => (
            <Link
              key={a.id}
              href={`/dashboard/assessments/${a.id}`}
              className="flex items-center justify-between gap-3 rounded-lg border p-4 hover:bg-accent"
            >
              <div>
                <p className="font-medium">{a.studentName}</p>
                <p className="text-sm text-muted-foreground">
                  {a.quiz.course.title} · {a.quiz.module.title} · {a.quiz.title}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">
                {a.submittedAt.toLocaleDateString("pt-BR")}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
