import { listOrganizations } from "@/services/admin.service";
import { Card, CardContent } from "@/components/ui/card";
import { OrgStatusSelect } from "@/components/admin/org-status-select";

export default async function AdminOrganizationsPage() {
  const orgs = await listOrganizations();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Organizações</h1>
        <p className="text-muted-foreground">Todas as escolas da plataforma.</p>
      </div>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Escola</th>
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 font-medium">Membros</th>
                <th className="px-4 py-3 font-medium">Cursos</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Criada em</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((org) => (
                <tr key={org.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{org.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{org.slug}</td>
                  <td className="px-4 py-3">{org._count.members}</td>
                  <td className="px-4 py-3">{org._count.courses}</td>
                  <td className="px-4 py-3">
                    <OrgStatusSelect organizationId={org.id} status={org.status} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {org.createdAt.toLocaleDateString("pt-BR")}
                  </td>
                </tr>
              ))}
              {orgs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhuma organização ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
