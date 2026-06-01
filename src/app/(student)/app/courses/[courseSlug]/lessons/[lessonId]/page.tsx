import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, FileText } from "lucide-react";

import { requireOrg } from "@/lib/tenant";
import { isStaff } from "@/lib/permissions";
import { getLessonForPlayer } from "@/services/progress.service";
import { getOrgPlan } from "@/services/school.service";
import { listLessonComments } from "@/services/community.service";
import { LessonCompleteButton } from "@/components/student/lesson-complete-button";
import { TutorChat } from "@/components/student/tutor-chat";
import { LessonComments } from "@/components/student/lesson-comments";
import { Card, CardContent } from "@/components/ui/card";

/** Renderiza o conteúdo da aula conforme o tipo. */
function LessonContent({
  contentType,
  videoUrl,
  textContent,
}: {
  contentType: string;
  videoUrl: string | null;
  textContent: string | null;
}) {
  if ((contentType === "VIDEO" || contentType === "EMBED") && videoUrl) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-lg border bg-black">
        <iframe
          src={videoUrl}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="Player da aula"
        />
      </div>
    );
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

  const { lesson, attachments, completed, nextLessonId } = data;

  const plan = await getOrgPlan(ctx.organizationId);
  const aiEnabled = plan?.hasAiFeatures ?? false;

  const comments = await listLessonComments(ctx.organizationId, lesson.id);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Link
        href={`/app/courses/${courseSlug}`}
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar ao curso
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">{lesson.title}</h1>
        {lesson.description && (
          <p className="mt-1 text-muted-foreground">{lesson.description}</p>
        )}
      </div>

      <LessonContent
        contentType={lesson.contentType}
        videoUrl={lesson.videoUrl}
        textContent={lesson.textContent}
      />

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
  );
}
