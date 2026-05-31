import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Circle, PlayCircle } from "lucide-react";

import { requireOrg } from "@/lib/tenant";
import {
  getStudentEnrollment,
  getCoursePlayer,
} from "@/services/progress.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IssueCertificateButton } from "@/components/student/issue-certificate-button";
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

  const { modules, progressByLesson } = await getCoursePlayer(
    ctx.userId,
    enrollment.course.id,
  );

  // Primeira aula não concluída, para o botão "continuar".
  const firstUnfinished = modules
    .flatMap((m) => m.lessons)
    .find((l) => progressByLesson.get(l.id) !== "COMPLETED");

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

      <div className="flex flex-col gap-4">
        {modules.map((mod, idx) => (
          <Card key={mod.id}>
            <CardHeader>
              <CardTitle className="text-base">
                {idx + 1}. {mod.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ul>
                {mod.lessons.map((lesson) => {
                  const done = progressByLesson.get(lesson.id) === "COMPLETED";
                  return (
                    <li key={lesson.id} className="border-t first:border-t-0">
                      <Link
                        href={`/app/courses/${courseSlug}/lessons/${lesson.id}`}
                        className="flex items-center gap-3 px-6 py-3 text-sm hover:bg-muted/40"
                      >
                        {done ? (
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
                    </li>
                  );
                })}
                {mod.lessons.length === 0 && (
                  <li className="px-6 py-3 text-sm text-muted-foreground">
                    Sem aulas neste módulo.
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
