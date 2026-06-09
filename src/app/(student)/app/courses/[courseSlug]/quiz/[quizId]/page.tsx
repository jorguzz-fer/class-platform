import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lock, Clock, CheckCircle2, XCircle } from "lucide-react";

import { requireOrg } from "@/lib/tenant";
import { getQuizForStudent } from "@/services/quiz.service";
import { QuizRunner } from "@/components/student/quiz-runner";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function QuizPage({
  params,
}: {
  params: Promise<{ courseSlug: string; quizId: string }>;
}) {
  const { courseSlug, quizId } = await params;
  const ctx = await requireOrg();

  const data = await getQuizForStudent(ctx.userId, quizId);
  if (!data || data.quiz.course.slug !== courseSlug) notFound();

  const { quiz, attempts, locked } = data;
  const backHref = `/app/courses/${courseSlug}`;

  const passed = attempts.find((a) => a.status === "PASSED");
  const pending = attempts.find((a) => a.status === "PENDING_GRADING");
  const used = attempts.length;
  const noAttemptsLeft =
    quiz.maxAttempts != null && used >= quiz.maxAttempts && !passed && !pending;

  const lastFailed = attempts.find((a) => a.status === "FAILED");

  function Shell({ children }: { children: React.ReactNode }) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <Link
          href={backHref}
          className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao curso
        </Link>
        <div>
          <p className="text-sm text-muted-foreground">
            Prova · {quiz.module.title}
          </p>
          <h1 className="text-2xl font-bold tracking-tight">{quiz.title}</h1>
        </div>
        {children}
      </div>
    );
  }

  if (locked) {
    return (
      <Shell>
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
            <Lock className="h-8 w-8" />
            <p>Este módulo está bloqueado. Conclua a prova do módulo anterior.</p>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  if (passed) {
    return (
      <Shell>
        <Card className="border-primary">
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <CheckCircle2 className="h-8 w-8 text-primary" />
            <p className="font-medium">Aprovado! Nota {passed.score}/10.</p>
            <p className="text-sm text-muted-foreground">
              Você já liberou o próximo módulo.
            </p>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  if (pending) {
    return (
      <Shell>
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
            <Clock className="h-8 w-8" />
            <p>
              Sua prova foi enviada e há questões dissertativas aguardando
              correção. Você verá o resultado em breve.
            </p>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  if (noAttemptsLeft) {
    return (
      <Shell>
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
            <XCircle className="h-8 w-8" />
            <p>
              Você atingiu o limite de tentativas
              {lastFailed ? ` (última nota ${lastFailed.score}/10)` : ""}.
            </p>
            <Link href={backHref} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              Voltar ao curso
            </Link>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  return (
    <Shell>
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-2 py-4 text-sm text-muted-foreground">
          <span>
            {quiz.questions.length}{" "}
            {quiz.questions.length === 1 ? "questão" : "questões"} · nota de corte{" "}
            {quiz.passingScore}/10
          </span>
          <span>
            {quiz.maxAttempts == null
              ? "Tentativas ilimitadas"
              : `Tentativa ${used + 1} de ${quiz.maxAttempts}`}
          </span>
        </CardContent>
      </Card>

      {lastFailed && (
        <p className="text-sm text-muted-foreground">
          Tentativa anterior: nota {lastFailed.score}/10. Tente novamente.
        </p>
      )}

      <QuizRunner
        quizId={quiz.id}
        courseSlug={courseSlug}
        passingScore={quiz.passingScore}
        questions={quiz.questions.map((q) => ({
          id: q.id,
          type: q.type,
          statement: q.statement,
          points: q.points,
          options: q.options,
        }))}
      />
    </Shell>
  );
}
