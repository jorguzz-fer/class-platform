import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { requireOrg } from "@/lib/tenant";
import { can } from "@/lib/permissions";
import { getCourse } from "@/services/course.service";
import { updateCourseAction } from "@/lib/actions/course-actions";
import { CourseForm } from "@/components/forms/course-form";
import { CourseStatusBadge } from "@/components/dashboard/course-status-badge";
import { CourseActionsBar } from "@/components/dashboard/course-actions-bar";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const ctx = await requireOrg();
  const course = await getCourse(ctx.organizationId, courseId);
  if (!course) notFound();

  // updateCourseAction precisa do courseId; bind via closure no server.
  const boundUpdate = updateCourseAction.bind(null, course.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          href="/dashboard/courses"
          className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{course.title}</h1>
            <CourseStatusBadge status={course.status} />
          </div>
          <Link
            href={`/dashboard/courses/${course.id}/modules`}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Gerenciar conteúdo
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ações</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="grid gap-1 text-sm text-muted-foreground sm:grid-cols-3">
            <span>Módulos: {course._count.modules}</span>
            <span>Aulas: {course._count.lessons}</span>
            <span>Matrículas: {course._count.enrollments}</span>
          </div>
          {can(ctx.role, "course:edit") && (
            <CourseActionsBar
              courseId={course.id}
              status={course.status}
              canDelete={can(ctx.role, "course:delete")}
            />
          )}
          {course.status === "DRAFT" &&
            (course._count.modules < 1 || course._count.lessons < 1) && (
              <p className="text-sm text-muted-foreground">
                Para publicar, adicione ao menos um módulo e uma aula.
              </p>
            )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalhes do curso</CardTitle>
        </CardHeader>
        <CardContent>
          <CourseForm
            action={boundUpdate}
            submitLabel="Salvar alterações"
            showExtraFields
            defaults={{
              title: course.title,
              subtitle: course.subtitle,
              description: course.description,
              level: course.level,
              visibility: course.visibility,
              category: course.category,
              thumbnailUrl: course.thumbnailUrl,
              price: course.price?.toString() ?? "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
