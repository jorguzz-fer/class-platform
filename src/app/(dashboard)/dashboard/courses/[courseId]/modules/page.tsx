import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { requireOrg } from "@/lib/tenant";
import { can } from "@/lib/permissions";
import { getCourse } from "@/services/course.service";
import { listModules } from "@/services/module.service";
import { CurriculumManager } from "@/components/dashboard/curriculum-manager";

export default async function CourseModulesPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const ctx = await requireOrg();
  if (!can(ctx.role, "course:edit")) redirect("/dashboard/courses");

  const course = await getCourse(ctx.organizationId, courseId);
  if (!course) notFound();

  const modules = await listModules(ctx.organizationId, courseId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          href={`/dashboard/courses/${courseId}`}
          className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao curso
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Conteúdo: {course.title}</h1>
        <p className="text-muted-foreground">
          Organize módulos e aulas. Use as setas para reordenar.
        </p>
      </div>

      <CurriculumManager
        courseId={courseId}
        modules={modules.map((m) => ({
          id: m.id,
          title: m.title,
          description: m.description,
          lessons: m.lessons.map((l) => ({
            id: l.id,
            title: l.title,
            contentType: l.contentType,
            isRequired: l.isRequired,
            isPreview: l.isPreview,
            attachments: l.attachments,
          })),
        }))}
      />
    </div>
  );
}
