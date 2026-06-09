import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { requireOrg } from "@/lib/tenant";
import { can } from "@/lib/permissions";
import { getModule } from "@/services/module.service";
import { getQuizByModule } from "@/services/quiz.service";
import { getOrgPlan } from "@/services/school.service";
import { QuizBuilder } from "@/components/dashboard/quiz-builder";

export default async function ModuleQuizPage({
  params,
}: {
  params: Promise<{ courseId: string; moduleId: string }>;
}) {
  const { courseId, moduleId } = await params;
  const ctx = await requireOrg();
  if (!can(ctx.role, "course:edit")) redirect("/dashboard/courses");

  const mod = await getModule(ctx.organizationId, moduleId);
  if (!mod || mod.courseId !== courseId) notFound();

  const quiz = await getQuizByModule(ctx.organizationId, moduleId);
  const plan = await getOrgPlan(ctx.organizationId);
  const aiEnabled = plan?.hasAiFeatures ?? false;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          href={`/dashboard/courses/${courseId}/modules`}
          className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao conteúdo
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">
          Prova: {mod.title}
        </h1>
        <p className="text-muted-foreground">
          Defina a nota de corte e as questões. A prova só vale para os alunos
          quando publicada.
        </p>
      </div>

      <QuizBuilder
        courseId={courseId}
        moduleId={moduleId}
        aiEnabled={aiEnabled}
        quiz={
          quiz
            ? {
                id: quiz.id,
                title: quiz.title,
                passingScore: quiz.passingScore,
                maxAttempts: quiz.maxAttempts,
                blocksProgress: quiz.blocksProgress,
                isPublished: quiz.isPublished,
                questions: quiz.questions.map((q) => ({
                  id: q.id,
                  type: q.type,
                  statement: q.statement,
                  points: q.points,
                  options: q.options.map((o) => ({
                    id: o.id,
                    text: o.text,
                    isCorrect: o.isCorrect,
                  })),
                })),
              }
            : null
        }
      />
    </div>
  );
}
