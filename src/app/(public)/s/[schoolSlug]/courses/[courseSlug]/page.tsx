import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, PlayCircle, Lock, BookOpen } from "lucide-react";

import {
  getPublicSchool,
  getPublicCourse,
} from "@/services/public-school.service";
import { PublicHeader } from "@/components/public/public-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SelfEnrollForm } from "@/components/student/self-enroll-form";
import { formatPrice, levelLabel } from "@/lib/course-format";

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
  const cover = course.coverUrl ?? course.thumbnailUrl;
  const level = levelLabel(course.level);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicHeader schoolSlug={schoolSlug} name={school.name} logoUrl={school.logoUrl} />

      {/* HERO */}
      <section className="relative isolate overflow-hidden border-b">
        <div className="absolute inset-0 -z-10">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" className="h-full w-full scale-105 object-cover blur-[2px]" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary/30 via-primary/10 to-muted" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/85 to-background/40" />
        </div>
        <div className="container py-10 sm:py-14">
          <Link
            href={`/s/${schoolSlug}`}
            className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            {school.name}
          </Link>
          <h1 className="mt-4 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
            {course.title}
          </h1>
          {course.subtitle && (
            <p className="mt-2 max-w-2xl text-base text-muted-foreground sm:text-lg">
              {course.subtitle}
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{formatPrice(course.price, course.currency)}</Badge>
            {level && <Badge variant="outline">{level}</Badge>}
            <span className="text-sm text-muted-foreground">
              {modules.length} módulos • {totalLessons} aulas
            </span>
          </div>
        </div>
      </section>

      {/* CONTEÚDO + INSCRIÇÃO */}
      <main className="container grid flex-1 gap-8 py-10 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {course.description && (
            <p className="whitespace-pre-wrap text-muted-foreground">
              {course.description}
            </p>
          )}

          <h2 className="mb-3 mt-8 text-xl font-semibold">Conteúdo do curso</h2>
          <div className="flex flex-col gap-4">
            {modules.length === 0 ? (
              <Card>
                <CardContent className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                  <BookOpen className="h-4 w-4" />
                  Conteúdo em breve.
                </CardContent>
              </Card>
            ) : (
              modules.map((mod, idx) => (
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
                            <PlayCircle className="h-4 w-4 shrink-0 text-primary" />
                          ) : (
                            <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
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
              ))
            )}
          </div>
        </div>

        {/* Card de inscrição — sticky no desktop, full no mobile */}
        <aside className="lg:col-span-1">
          <Card className="lg:sticky lg:top-20">
            <CardContent className="flex flex-col gap-3 p-6">
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-semibold">Inscreva-se</span>
                <Badge variant="secondary">
                  {formatPrice(course.price, course.currency)}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Crie sua conta e comece <strong>agora mesmo</strong> — acesso
                imediato ao curso, sem espera.
              </p>
              <SelfEnrollForm schoolSlug={schoolSlug} courseSlug={courseSlug} />
              <p className="text-center text-xs text-muted-foreground">
                Já tem conta?{" "}
                <Link href="/login" className="font-medium text-primary hover:underline">
                  Entrar
                </Link>
              </p>
            </CardContent>
          </Card>
        </aside>
      </main>

      <footer className="border-t">
        <div className="container flex h-16 items-center text-sm text-muted-foreground">
          {school.name} • powered by ClassOS
        </div>
      </footer>
    </div>
  );
}
