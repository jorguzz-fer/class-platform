import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, PlayCircle, Lock } from "lucide-react";

import {
  getPublicSchool,
  getPublicCourse,
} from "@/services/public-school.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SelfEnrollForm } from "@/components/student/self-enroll-form";

function price(p: unknown, currency: string) {
  const v = Number(p ?? 0);
  if (v === 0) return "Gratuito";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(v);
}

export default async function PublicCoursePage({
  params,
}: {
  params: Promise<{ schoolSlug: string; courseSlug: string }>;
}) {
  const { schoolSlug, courseSlug } = await params;
  const school = await getPublicSchool(schoolSlug);
  if (!school) notFound();

  const data = await getPublicCourse(school.organizationId, courseSlug);
  if (!data) notFound();

  const { course, modules } = data;
  const totalLessons = modules.reduce((sum, m) => sum + m.lessons.length, 0);

  return (
    <div className="container max-w-3xl py-10">
      <Link
        href={`/s/${schoolSlug}`}
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        {school.name}
      </Link>

      <div className="mt-4 flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">{course.title}</h1>
        {course.subtitle && (
          <p className="text-lg text-muted-foreground">{course.subtitle}</p>
        )}
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{price(course.price, course.currency)}</Badge>
          <span className="text-sm text-muted-foreground">
            {modules.length} módulos • {totalLessons} aulas
          </span>
        </div>
      </div>

      {course.description && (
        <p className="mt-6 whitespace-pre-wrap text-muted-foreground">
          {course.description}
        </p>
      )}

      <h2 className="mb-3 mt-8 text-xl font-semibold">Conteúdo do curso</h2>
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
                {mod.lessons.map((lesson) => (
                  <li
                    key={lesson.id}
                    className="flex items-center gap-3 border-t px-6 py-3 text-sm first:border-t-0"
                  >
                    {lesson.isPreview ? (
                      <PlayCircle className="h-4 w-4 text-primary" />
                    ) : (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="flex-1">{lesson.title}</span>
                    {lesson.isPreview && (
                      <Badge variant="outline" className="text-[10px]">
                        Prévia
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 flex flex-col items-center gap-3 rounded-lg border bg-muted/30 p-6 text-center">
        <p className="text-lg font-semibold">Solicitar inscrição</p>
        <p className="text-xs text-muted-foreground">
          Crie sua conta para pedir acesso. A escola precisa aprovar antes de
          você entrar no curso.
        </p>
        <div className="mt-2 w-full max-w-xs">
          <SelfEnrollForm schoolSlug={schoolSlug} courseSlug={courseSlug} />
        </div>
      </div>
    </div>
  );
}
