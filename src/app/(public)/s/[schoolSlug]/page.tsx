import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, PlayCircle, ArrowRight } from "lucide-react";

import { getPublicSchool, listPublicCourses } from "@/services/public-school.service";
import { PublicHeader } from "@/components/public/public-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { formatPrice, levelLabel } from "@/lib/course-format";
import { cn } from "@/lib/utils";

type PublicCourse = Awaited<ReturnType<typeof listPublicCourses>>[number];

/** Miniatura do curso (thumbnail ou placeholder com gradiente). Aspecto 16:9. */
function CourseThumb({ course, className }: { course: PublicCourse; className?: string }) {
  if (course.thumbnailUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={course.thumbnailUrl}
        alt={course.title}
        className={cn("h-full w-full object-cover", className)}
      />
    );
  }
  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/30 via-primary/10 to-muted",
        className,
      )}
    >
      <BookOpen className="h-10 w-10 text-primary/70" />
    </div>
  );
}

function CourseCard({ course, schoolSlug }: { course: PublicCourse; schoolSlug: string }) {
  const level = levelLabel(course.level);
  return (
    <Link
      href={`/s/${schoolSlug}/courses/${course.slug}`}
      className="group focus-visible:outline-none"
    >
      <Card className="h-full overflow-hidden border-border/60 transition-all duration-200 group-hover:-translate-y-1 group-hover:border-primary group-hover:shadow-lg group-focus-visible:ring-2 group-focus-visible:ring-ring">
        <div className="relative aspect-video w-full overflow-hidden bg-muted">
          <CourseThumb
            course={course}
            className="transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
            <PlayCircle className="h-12 w-12 text-white drop-shadow" />
          </div>
        </div>
        <CardContent className="flex flex-col gap-2 p-4">
          <h3 className="line-clamp-2 font-semibold leading-tight">{course.title}</h3>
          {course.subtitle && (
            <p className="line-clamp-2 text-sm text-muted-foreground">{course.subtitle}</p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{formatPrice(course.price, course.currency)}</Badge>
            {level && <Badge variant="outline">{level}</Badge>}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default async function PublicSchoolPage({
  params,
}: {
  params: Promise<{ schoolSlug: string }>;
}) {
  const { schoolSlug } = await params;
  const school = await getPublicSchool(schoolSlug);
  if (!school) notFound();

  const courses = await listPublicCourses(school.organizationId);
  const featured = courses[0];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicHeader schoolSlug={schoolSlug} name={school.name} logoUrl={school.logoUrl} />

      {courses.length === 0 ? (
        <main className="container flex flex-1 flex-col items-center justify-center gap-3 py-24 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-medium">Em breve, novos cursos</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {school.description ?? "Esta escola ainda não publicou cursos."}
          </p>
        </main>
      ) : (
        <main className="flex-1">
          {/* HERO — curso em destaque */}
          <section className="relative isolate overflow-hidden border-b">
            <div className="absolute inset-0 -z-10">
              {school.heroImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={school.heroImageUrl}
                  alt=""
                  className="h-full w-full scale-105 object-cover blur-[2px]"
                />
              ) : (
                <CourseThumb course={featured} className="scale-105 blur-[2px]" />
              )}
              {/* Sobreposição para legibilidade do texto em ambos os temas. */}
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/85 to-background/40" />
              <div className="absolute inset-0 bg-gradient-to-r from-background/90 to-transparent" />
            </div>
            <div className="container flex flex-col gap-4 py-12 sm:py-16 md:max-w-2xl md:py-24">
              {school.description && (
                <p className="text-sm text-muted-foreground">{school.description}</p>
              )}
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                {featured.title}
              </h1>
              {featured.subtitle && (
                <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
                  {featured.subtitle}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">
                  {formatPrice(featured.price, featured.currency)}
                </Badge>
                {levelLabel(featured.level) && (
                  <Badge variant="outline">{levelLabel(featured.level)}</Badge>
                )}
              </div>
              <div>
                <Link
                  href={`/s/${schoolSlug}/courses/${featured.slug}`}
                  className={cn(buttonVariants({ size: "lg" }), "mt-2 gap-2")}
                >
                  <PlayCircle className="h-5 w-5" />
                  Começar agora
                </Link>
              </div>
            </div>
          </section>

          {/* GRADE de cursos */}
          <section className="container py-10">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
                Todos os cursos
              </h2>
              <span className="text-sm text-muted-foreground">
                {courses.length} {courses.length === 1 ? "curso" : "cursos"}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => (
                <CourseCard key={course.id} course={course} schoolSlug={schoolSlug} />
              ))}
            </div>
          </section>
        </main>
      )}

      <footer className="border-t">
        <div className="container flex h-16 flex-wrap items-center gap-1 text-sm text-muted-foreground">
          <span>{school.name}</span>
          <span className="hidden sm:inline">•</span>
          <span className="inline-flex items-center gap-1">
            powered by ClassOS <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </footer>
    </div>
  );
}
