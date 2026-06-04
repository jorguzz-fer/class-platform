import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { requireOrg } from "@/lib/tenant";
import { can } from "@/lib/permissions";
import { CompanyForm } from "@/components/forms/company-form";

export default async function NewCompanyPage() {
  const ctx = await requireOrg();
  if (!can(ctx.role, "org:manage_team")) redirect("/dashboard");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          href="/dashboard/companies"
          className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Nova empresa</h1>
      </div>
      <CompanyForm />
    </div>
  );
}
