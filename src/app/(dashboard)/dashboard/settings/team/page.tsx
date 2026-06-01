import { redirect } from "next/navigation";

import { requireOrg } from "@/lib/tenant";
import { can } from "@/lib/permissions";
import { listTeam } from "@/services/school.service";
import { SettingsNav } from "@/components/dashboard/settings-nav";
import { TeamManager } from "@/components/dashboard/team-manager";

export default async function TeamSettingsPage() {
  const ctx = await requireOrg();
  if (!can(ctx.role, "org:manage_team")) redirect("/dashboard");

  const members = await listTeam(ctx.organizationId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">Gerencie a equipe da sua escola.</p>
      </div>
      <SettingsNav />
      <TeamManager
        members={members.map((m) => ({ id: m.id, role: m.role, user: m.user }))}
      />
    </div>
  );
}
