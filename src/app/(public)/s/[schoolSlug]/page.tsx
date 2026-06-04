import Link from "next/link";
import { notFound } from "next/navigation";
import { GraduationCap, BookOpen } from "lucide-react";

import { getPublicSchool, listPublicCourses } from "@/services/public-school.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function price(p: unknown, currency: string) {
  const v = Number(p ?? 0);
  if (v === 0) return "Gratuito";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(v);
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

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container flex h-16 items-center gap-2 font-semibold">
          {school.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={school.logoUrl} alt={school.name} className="h-8 w-8 rounded object-cover" />
          ) : (
            <GraduationCap className="h-6 w-6" />
          )}
          <span>{school.name}</span>
        </div>
      </header>

      <main className="container flex-1 py-10">
        {school.description && (
          <p className="mb-8 max-w-2xl text-muted-foreground">{school.description}</p>
        )}

        <h1 className="mb-6 text-2xl font-bold tracking-tight">Cursos</h1>

        {courses.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
              <BookOpen className="h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground">
                Esta escola ainda não tem cursos públicos.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <Link key={course.id} href={`/s/${schoolSlug}/courses/${course.slug}`}>
                <Card className="h-full transition-colors hover:border-primary">
                  <CardHeader>
                    <CardTitle className="text-base">{course.title}</CardTitle>
                    {course.subtitle && (
                      <p className="text-sm text-muted-foreground">{course.subtitle}</p>
                    )}
                  </CardHeader>
                  <CardContent className="flex items-center justify-between">
                    <Badge variant="secondary">{price(course.price, course.currency)}</Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t">
        <div className="container flex h-16 items-center text-sm text-muted-foreground">
          {school.name} • powered by ClassOS
        </div>
      </footer>
    </div>
  );
}
