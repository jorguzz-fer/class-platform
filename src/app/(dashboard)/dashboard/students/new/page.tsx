import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { requireOrg } from "@/lib/tenant";
import { can } from "@/lib/permissions";
import { createStudentAction } from "@/lib/actions/student-actions";
import { NewStudentForm } from "@/components/forms/student-form";

export default async function NewStudentPage() {
  const ctx = await requireOrg();
  if (!can(ctx.role, "student:manage")) redirect("/dashboard/students");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          href="/dashboard/students"
          className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Novo aluno</h1>
        <p className="text-muted-foreground">
          Cadastre o aluno na sua escola. Você pode matriculá-lo em cursos depois.
        </p>
      </div>

      <NewStudentForm action={createStudentAction} />
    </div>
  );
}
