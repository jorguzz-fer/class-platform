import Link from "next/link";
import { ArrowLeft, Sparkles, FileUp } from "lucide-react";
import { redirect } from "next/navigation";

import { requireOrg } from "@/lib/tenant";
import { can } from "@/lib/permissions";
import { getOrgPlan } from "@/services/school.service";
import { createCourseAction } from "@/lib/actions/course-actions";
import { CourseForm } from "@/components/forms/course-form";
import { AIOutlineForm } from "@/components/forms/ai-outline-form";
import { AIDocumentForm } from "@/components/forms/ai-document-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NewCoursePage() {
  const ctx = await requireOrg();
  if (!can(ctx.role, "course:create")) redirect("/dashboard/courses");

  const plan = await getOrgPlan(ctx.organizationId);
  const aiEnabled = plan?.hasAiFeatures ?? false;

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

      {aiEnabled && (
        <Card className="border-primary/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4" />
              Criar com IA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AIOutlineForm />
          </CardContent>
        </Card>
      )}

      {aiEnabled && (
        <Card className="border-primary/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileUp className="h-4 w-4" />
              Criar a partir de um documento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AIDocumentForm />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Criar manualmente</CardTitle>
        </CardHeader>
        <CardContent>
          <CourseForm
            action={createCourseAction}
            submitLabel="Criar curso"
            showExtraFields
          />
        </CardContent>
      </Card>
    </div>
  );
}
