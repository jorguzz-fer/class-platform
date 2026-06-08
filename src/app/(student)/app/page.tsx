import Link from "next/link";
import { BookOpen } from "lucide-react";

import { requireOrg } from "@/lib/tenant";
import {
  listStudentCourses,
  listPendingStudentCourses,
} from "@/services/progress.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Badge } from "@/components/ui/badge";

export default async function StudentHomePage() {
  const ctx = await requireOrg();
  const [courses, pending] = await Promise.all([
    listStudentCourses(ctx.userId),
    listPendingStudentCourses(ctx.userId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Meus cursos</h1>
        <p className="text-muted-foreground">Continue de onde você parou.</p>
      </div>

      {courses.length === 0 && pending.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">Você ainda não está matriculado em cursos</p>
            <p className="text-sm text-muted-foreground">
              Assim que for matriculado, seus cursos aparecerão aqui.
            </p>
          </CardContent>
        </Card>
      ) : (
        courses.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((item) => (
              <Link key={item.enrollmentId} href={`/app/courses/${item.course.slug}`}>
                <Card className="h-full transition-colors hover:border-primary">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{item.course.title}</CardTitle>
                      {item.status === "COMPLETED" && (
                        <Badge variant="secondary">Concluído</Badge>
                      )}
                    </div>
                    {item.course.subtitle && (
                      <p className="text-sm text-muted-foreground">
                        {item.course.subtitle}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2">
                    <ProgressBar value={item.percent} />
                    <p className="text-xs text-muted-foreground">
                      {item.requiredDone}/{item.requiredTotal} aulas obrigatórias •{" "}
                      {item.percent}%
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )
      )}

      {pending.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Aguardando aprovação
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pending.map((item) => (
              <Card key={item.id} className="h-full opacity-80">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{item.course.title}</CardTitle>
                    <Badge variant="outline">Pendente</Badge>
                  </div>
                  {item.course.subtitle && (
                    <p className="text-sm text-muted-foreground">
                      {item.course.subtitle}
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Sua solicitação foi enviada. Você terá acesso assim que a
                    escola aprovar.
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
