import { redirect } from "next/navigation";

import { requireOrg } from "@/lib/tenant";
import { can } from "@/lib/permissions";
import { getSchool, getOrgPlan } from "@/services/school.service";
import { SettingsNav } from "@/components/dashboard/settings-nav";
import { DomainForm } from "@/components/forms/domain-form";

export default async function DomainSettingsPage() {
  const ctx = await requireOrg();
  if (!can(ctx.role, "org:manage_domain")) redirect("/dashboard");

  const [school, plan] = await Promise.all([
    getSchool(ctx.organizationId),
    getOrgPlan(ctx.organizationId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">Endereço da sua escola.</p>
      </div>
      <SettingsNav />
      <DomainForm
        defaults={{ subdomain: school?.subdomain, customDomain: school?.customDomain }}
        canCustomDomain={plan?.hasCustomDomain ?? false}
      />
    </div>
  );
}
