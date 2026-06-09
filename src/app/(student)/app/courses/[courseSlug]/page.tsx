import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CheckCircle2,
  Circle,
  PlayCircle,
  Star,
  Lock,
  ClipboardList,
  Clock,
} from "lucide-react";

import { requireOrg } from "@/lib/tenant";
import { getStudentEnrollment } from "@/services/progress.service";
import { getStudentCourseOutline } from "@/services/quiz.service";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getStudentCourseRating,
  getCourseRatingSummary,
} from "@/services/rating.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IssueCertificateButton } from "@/components/student/issue-certificate-button";
import { StarRating } from "@/components/student/star-rating";
import { rateCourseAction } from "@/lib/actions/rating-actions";
import { db } from "@/lib/db";

export default async function StudentCoursePage({
  params,
}: {
  params: Promise<{ courseSlug: string }>;
}) {
  const { courseSlug } = await params;
  const ctx = await requireOrg();

  const enrollment = await getStudentEnrollment(ctx.userId, courseSlug);
  if (!enrollment) notFound();

  const modules = await getStudentCourseOutline(ctx.userId, enrollment.course.id);

  // Primeira aula não concluída em módulo liberado, para o botão "continuar".
  const firstUnfinished = modules
    .filter((m) => !m.locked)
    .flatMap((m) => m.lessons)
    .find((l) => !l.completed);

  const [myCourseRating, ratingSummary] = await Promise.all([
    getStudentCourseRating(ctx.userId, enrollment.course.id),
    getCourseRatingSummary(enrollment.course.id),
  ]);

  // Certificado: curso concluído + verifica se já foi emitido.
  const courseCompleted = enrollment.status === "COMPLETED";
  const existingCertificate = courseCompleted
    ? await db.certificate.findUnique({
        where: {
          courseId_studentId: {
            courseId: enrollment.course.id,
            studentId: ctx.userId,
          },
        },
        select: { id: true },
      })
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Link href="/app" className="text-sm text-muted-foreground hover:underline">
            ← Meus cursos
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">
            {enrollment.course.title}
          </h1>
        </div>
        {firstUnfinished && (
          <Link
            href={`/app/courses/${courseSlug}/lessons/${firstUnfinished.id}`}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <PlayCircle className="h-4 w-4" />
            Continuar
          </Link>
        )}
      </div>

      {courseCompleted && (
        <Card className="border-primary">
          <CardContent className="flex flex-col items-start gap-3 py-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">🎉 Você concluiu este curso!</p>
              <p className="text-sm text-muted-foreground">
                Emita seu certificado de conclusão.
              </p>
            </div>
            {existingCertificate ? (
              <Link
                href={`/app/certificates/${existingCertificate.id}`}
                className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-4 text-sm font-medium hover:bg-accent"
              >
                Ver certificado
              </Link>
            ) : (
              <IssueCertificateButton courseId={enrollment.course.id} />
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div>
            <p className="text-sm font-medium">Avalie este curso</p>
            {ratingSummary.count > 0 && (
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                {ratingSummary.average} · {ratingSummary.count}{" "}
                {ratingSummary.count === 1 ? "avaliação" : "avaliações"}
              </p>
            )}
          </div>
          <StarRating
            value={myCourseRating}
            onRate={rateCourseAction.bind(null, enrollment.course.id, courseSlug)}
          />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        {modules.map((mod, idx) => (
          <Card key={mod.id} className={mod.locked ? "opacity-70" : undefined}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                {mod.locked && <Lock className="h-4 w-4 text-muted-foreground" />}
                {idx + 1}. {mod.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ul>
                {mod.lessons.map((lesson) => (
                  <li key={lesson.id} className="border-t first:border-t-0">
                    {mod.locked ? (
                      <div className="flex items-center gap-3 px-6 py-3 text-sm text-muted-foreground">
                        <Lock className="h-4 w-4" />
                        <span className="flex-1">{lesson.title}</span>
                      </div>
                    ) : (
                      <Link
                        href={`/app/courses/${courseSlug}/lessons/${lesson.id}`}
                        className="flex items-center gap-3 px-6 py-3 text-sm hover:bg-muted/40"
                      >
                        {lesson.completed ? (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="flex-1">{lesson.title}</span>
                        {!lesson.isRequired && (
                          <Badge variant="secondary" className="text-[10px]">
                            Opcional
                          </Badge>
                        )}
                      </Link>
                    )}
                  </li>
                ))}
                {mod.lessons.length === 0 && (
                  <li className="px-6 py-3 text-sm text-muted-foreground">
                    Sem aulas neste módulo.
                  </li>
                )}
              </ul>

              {mod.quiz && !mod.locked && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/20 px-6 py-3">
                  <span className="flex items-center gap-2 text-sm">
                    <ClipboardList className="h-4 w-4 text-muted-foreground" />
                    {mod.quiz.passed ? (
                      <span className="font-medium text-primary">
                        Prova aprovada · nota {mod.quiz.bestScore}/10
                      </span>
                    ) : mod.quiz.pendingGrading ? (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-4 w-4" /> Aguardando correção
                      </span>
                    ) : (
                      <span>
                        Prova do módulo · nota de corte {mod.quiz.passingScore}/10
                        {mod.quiz.attemptsLeft != null &&
                          ` · ${mod.quiz.attemptsLeft} tentativa(s)`}
                      </span>
                    )}
                  </span>

                  {mod.quiz.canTake ? (
                    <Link
                      href={`/app/courses/${courseSlug}/quiz/${mod.quiz.id}`}
                      className={cn(
                        buttonVariants({ size: "sm" }),
                        "gap-1",
                      )}
                    >
                      <ClipboardList className="h-4 w-4" />
                      {mod.quiz.lastStatus === "FAILED" ? "Refazer prova" : "Fazer prova"}
                    </Link>
                  ) : (
                    !mod.quiz.passed &&
                    !mod.quiz.pendingGrading && (
                      <span className="text-xs text-muted-foreground">
                        {!mod.quiz.requiredLessonsDone
                          ? "Conclua as aulas para liberar"
                          : "Sem tentativas restantes"}
                      </span>
                    )
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
