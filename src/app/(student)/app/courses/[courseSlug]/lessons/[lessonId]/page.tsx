import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Download,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { requireOrg } from "@/lib/tenant";
import { isStaff } from "@/lib/permissions";
import { getLessonForPlayer, getCoursePlayer } from "@/services/progress.service";
import { getStudentLessonRating } from "@/services/rating.service";
import { getOrgPlan } from "@/services/school.service";
import { listLessonComments } from "@/services/community.service";
import { LessonCompleteButton } from "@/components/student/lesson-complete-button";
import { TutorChat } from "@/components/student/tutor-chat";
import { LessonComments } from "@/components/student/lesson-comments";
import { CourseOutlineNav } from "@/components/student/course-outline-nav";
import { StarRating } from "@/components/student/star-rating";
import { LessonVideoPlayer } from "@/components/student/lesson-video-player";
import { rateLessonAction } from "@/lib/actions/rating-actions";
import { resolveEmbed } from "@/lib/video/registry";
import { Card, CardContent } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Renderiza o conteúdo da aula conforme o tipo. */
function LessonContent({
  contentType,
  videoProvider,
  videoId,
  videoUrl,
  textContent,
  lessonId,
  courseSlug,
  completed,
}: {
  contentType: string;
  videoProvider: string | null;
  videoId: string | null;
  videoUrl: string | null;
  textContent: string | null;
  lessonId: string;
  courseSlug: string;
  completed: boolean;
}) {
  if (contentType === "VIDEO" || contentType === "EMBED") {
    const embed = resolveEmbed({ videoProvider, videoId, videoUrl });
    if (embed.type !== "none") {
      return (
        <LessonVideoPlayer
          embed={embed}
          provider={videoProvider}
          videoId={videoId}
          lessonId={lessonId}
          courseSlug={courseSlug}
          completed={completed}
        />
      );
    }
  }

  if (contentType === "TEXT" && textContent) {
    return (
      <Card>
        <CardContent className="prose prose-sm max-w-none whitespace-pre-wrap py-6">
          {textContent}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
        <FileText className="h-8 w-8" />
        <p>Conteúdo desta aula ainda não disponível.</p>
      </CardContent>
    </Card>
  );
}

export default async function LessonPlayerPage({
  params,
}: {
  params: Promise<{ courseSlug: string; lessonId: string }>;
}) {
  const { courseSlug, lessonId } = await params;
  const ctx = await requireOrg();

  const data = await getLessonForPlayer(ctx.userId, lessonId);
  if (!data) notFound();

  const { lesson, attachments, completed, nextLessonId, prevLessonId, position } =
    data;

  const { modules, progressByLesson } = await getCoursePlayer(
    ctx.userId,
    lesson.courseId,
  );
  const completedLessonIds = new Set(
    [...progressByLesson.entries()]
      .filter(([, status]) => status === "COMPLETED")
      .map(([id]) => id),
  );
  // Progresso do curso por aulas obrigatórias (consistente com a home do aluno).
  const allLessons = modules.flatMap((m) => m.lessons);
  const requiredTotal = allLessons.filter((l) => l.isRequired).length;
  const requiredDone = allLessons.filter(
    (l) => l.isRequired && completedLessonIds.has(l.id),
  ).length;
  const percent =
    requiredTotal > 0
      ? Math.round((requiredDone / requiredTotal) * 100)
      : allLessons.length > 0
        ? Math.round((completedLessonIds.size / allLessons.length) * 100)
        : 0;

  const plan = await getOrgPlan(ctx.organizationId);
  const aiEnabled = plan?.hasAiFeatures ?? false;
  const comments = await listLessonComments(ctx.organizationId, lesson.id);
  const lessonRating = await getStudentLessonRating(ctx.userId, lesson.id);

  const prevHref = prevLessonId
    ? `/app/courses/${courseSlug}/lessons/${prevLessonId}`
    : null;
  const nextHref = nextLessonId
    ? `/app/courses/${courseSlug}/lessons/${nextLessonId}`
    : null;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 lg:flex-row lg:items-start">
      {/* Conteúdo principal */}
      <div className="flex w-full flex-1 flex-col gap-6 lg:max-w-3xl">
        <Link
          href={`/app/courses/${courseSlug}`}
          className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao curso
        </Link>

        <div>
          <p className="text-sm text-muted-foreground">
            Aula {position.current} de {position.total}
          </p>
          <h1 className="text-2xl font-bold tracking-tight">{lesson.title}</h1>
          {lesson.description && (
            <p className="mt-1 text-muted-foreground">{lesson.description}</p>
          )}
        </div>

        <LessonContent
          contentType={lesson.contentType}
          videoProvider={lesson.videoProvider}
          videoId={lesson.videoId}
          videoUrl={lesson.videoUrl}
          textContent={lesson.textContent}
          lessonId={lesson.id}
          courseSlug={courseSlug}
          completed={completed}
        />

        {/* Navegação anterior/próxima (sempre visível) */}
        <div className="flex items-center justify-between gap-2">
          {prevHref ? (
            <Link
              href={prevHref}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1")}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Link>
          ) : (
            <span />
          )}
          {nextHref ? (
            <Link
              href={nextHref}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1")}
            >
              Próxima
              <ChevronRight className="h-4 w-4" />
            </Link>
          ) : (
            <span />
          )}
        </div>

        {attachments.length > 0 && (
          <Card>
            <CardContent className="flex flex-col gap-2 py-4">
              <p className="text-sm font-medium">Materiais</p>
              {attachments.map((a) => (
                <a
                  key={a.id}
                  href={a.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Download className="h-4 w-4" />
                  {a.fileName}
                </a>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="border-t pt-4">
          <LessonCompleteButton
            lessonId={lesson.id}
            courseSlug={courseSlug}
            completed={completed}
            nextLessonId={nextLessonId}
          />
        </div>

        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <span className="text-sm font-medium">Avalie esta aula</span>
            <StarRating
              value={lessonRating}
              size="sm"
              onRate={rateLessonAction.bind(null, lesson.id)}
            />
          </CardContent>
        </Card>

        {aiEnabled && <TutorChat courseId={lesson.courseId} lessonId={lesson.id} />}

        <LessonComments
          lessonId={lesson.id}
          courseSlug={courseSlug}
          currentUserId={ctx.userId}
          isStaff={isStaff(ctx.role)}
          comments={comments.map((c) => ({
            id: c.id,
            authorName: c.author.name,
            authorId: c.author.id,
            content: c.content,
          }))}
        />
      </div>

      {/* Barra lateral: progresso do curso + currículo */}
      <aside className="w-full lg:w-72 lg:shrink-0">
        <div className="flex flex-col gap-4 rounded-lg border p-4 lg:sticky lg:top-6">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Progresso do curso</span>
              <span className="text-muted-foreground">{percent}%</span>
            </div>
            <ProgressBar value={percent} />
          </div>
          <CourseOutlineNav
            courseSlug={courseSlug}
            currentLessonId={lesson.id}
            modules={modules}
            completedLessonIds={completedLessonIds}
          />
        </div>
      </aside>
    </div>
  );
}
