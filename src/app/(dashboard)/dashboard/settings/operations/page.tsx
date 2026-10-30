import { redirect } from "next/navigation";

import { requireOrg } from "@/lib/tenant";
import { can } from "@/lib/permissions";
import { getStudentOperations } from "@/services/student.service";
import { SettingsNav } from "@/components/dashboard/settings-nav";
import { StudentOperationsForm } from "@/components/forms/student-operations-form";

export default async function OperationsSettingsPage() {
  const ctx = await requireOrg();
  if (!can(ctx.role, "student:manage")) redirect("/dashboard");

  const operations = await getStudentOperations(ctx.organizationId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">
          Operações classificam os alunos da escola (ex.: cliente ou unidade). Com
          a lista preenchida, o campo &quot;Operação&quot; aparece no cadastro de
          alunos, na inscrição pelo link e como filtro na lista de alunos.
        </p>
      </div>
      <SettingsNav />
      <StudentOperationsForm operations={operations} />
    </div>
  );
}
