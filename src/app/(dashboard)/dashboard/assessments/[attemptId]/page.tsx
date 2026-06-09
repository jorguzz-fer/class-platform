import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Check, X } from "lucide-react";

import { requireOrg } from "@/lib/tenant";
import { can } from "@/lib/permissions";
import { getAttemptForGrading } from "@/services/quiz.service";
import { GradeForm } from "@/components/dashboard/grade-form";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function GradeAttemptPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const ctx = await requireOrg();
  if (!can(ctx.role, "course:edit")) redirect("/dashboard");

  const data = await getAttemptForGrading(ctx.organizationId, attemptId);
  if (!data) notFound();
  const { attempt, studentName } = data;

  const totalPoints = attempt.answers.reduce(
    (s, a) => s + a.question.points,
    0,
  );
  const objectiveEarned = attempt.answers
    .filter((a) => a.question.type !== "OPEN")
    .reduce((s, a) => s + a.awardedPoints, 0);

  const alreadyGraded = attempt.status !== "PENDING_GRADING";

  const openAnswers = attempt.answers
    .filter((a) => a.question.type === "OPEN")
    .map((a) => ({
      answerId: a.id,
      statement: a.question.statement,
      points: a.question.points,
      textAnswer: a.textAnswer ?? "",
      awardedPoints: a.awardedPoints,
    }));

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          href="/dashboard/assessments"
          className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar às correções
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">{studentName}</h1>
        <p className="text-muted-foreground">
          {attempt.quiz.course.title} · {attempt.quiz.module.title} ·{" "}
          {attempt.quiz.title}
        </p>
        <p className="text-sm text-muted-foreground">
          Objetivas: {objectiveEarned} de {totalPoints} pontos · nota de corte{" "}
          {attempt.quiz.passingScore}/10
        </p>
      </div>

      {/* Objetivas (somente leitura) */}
      <div className="flex flex-col gap-3">
        {attempt.answers
          .filter((a) => a.question.type !== "OPEN")
          .map((a) => (
            <Card key={a.id}>
              <CardContent className="flex flex-col gap-2 py-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{a.question.statement}</p>
                  <Badge variant={a.isCorrect ? "default" : "secondary"}>
                    {a.isCorrect ? "Correta" : "Incorreta"}
                  </Badge>
                </div>
                <ul className="flex flex-col gap-1 pl-1">
                  {a.question.options.map((o) => {
                    const chosen = a.selectedOptionIds.includes(o.id);
                    return (
                      <li
                        key={o.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        {o.isCorrect ? (
                          <Check className="h-4 w-4 text-primary" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground/40" />
                        )}
                        <span
                          className={
                            chosen ? "font-medium underline" : "text-muted-foreground"
                          }
                        >
                          {o.text}
                          {chosen ? " (marcada)" : ""}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          ))}
      </div>

      {alreadyGraded ? (
        <Card className="border-primary">
          <CardContent className="py-6 text-center">
            <p className="font-medium">
              Já corrigida — nota {attempt.score}/10 (
              {attempt.status === "PASSED" ? "aprovado" : "reprovado"}).
            </p>
          </CardContent>
        </Card>
      ) : (
        <GradeForm
          attemptId={attempt.id}
          openAnswers={openAnswers}
          objectiveEarned={objectiveEarned}
          totalPoints={totalPoints}
          passingScore={attempt.quiz.passingScore}
        />
      )}
    </div>
  );
}
