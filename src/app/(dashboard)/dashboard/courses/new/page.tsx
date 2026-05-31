import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { requireOrg } from "@/lib/tenant";
import { can } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { createCourseAction } from "@/lib/actions/course-actions";
import { CourseForm } from "@/components/forms/course-form";

export default async function NewCoursePage() {
  const ctx = await requireOrg();
  if (!can(ctx.role, "course:create")) redirect("/dashboard/courses");

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
        <h1 className="text-2xl font-bold tracking-tight">Novo curso</h1>
        <p className="text-muted-foreground">
          O curso será criado como rascunho. Você adiciona módulos e aulas depois.
        </p>
      </div>

      <CourseForm action={createCourseAction} submitLabel="Criar curso" />
    </div>
  );
}
