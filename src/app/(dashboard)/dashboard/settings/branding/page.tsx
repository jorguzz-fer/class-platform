import { redirect } from "next/navigation";

import { requireOrg } from "@/lib/tenant";
import { can } from "@/lib/permissions";
import { getSchool } from "@/services/school.service";
import { SettingsNav } from "@/components/dashboard/settings-nav";
import { BrandingForm } from "@/components/forms/branding-form";

export default async function BrandingSettingsPage() {
  const ctx = await requireOrg();
  if (!can(ctx.role, "org:manage_branding")) redirect("/dashboard");

  const school = await getSchool(ctx.organizationId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">Personalize a identidade da sua escola.</p>
      </div>
      <SettingsNav />
      <BrandingForm
        defaults={{
          name: school?.name ?? "",
          description: school?.description,
          logoUrl: school?.logoUrl,
          faviconUrl: school?.faviconUrl,
          heroImageUrl: school?.heroImageUrl,
          primaryColor: school?.primaryColor,
          secondaryColor: school?.secondaryColor,
          backgroundColor: school?.backgroundColor,
        }}
      />
    </div>
  );
}
