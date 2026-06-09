import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Building2 } from "lucide-react";

import { requireOrg } from "@/lib/tenant";
import { can } from "@/lib/permissions";
import { listCompanies } from "@/services/company.service";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default async function CompaniesPage() {
  const ctx = await requireOrg();
  if (!can(ctx.role, "org:manage_team")) redirect("/dashboard");

  const companies = await listCompanies(ctx.organizationId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Empresas</h1>
          <p className="text-muted-foreground">
            Clientes corporativos: gestores e turmas de treinamento.
          </p>
        </div>
        <Link href="/dashboard/companies/new" className={cn(buttonVariants(), "gap-2")}>
          <Plus className="h-4 w-4" />
          Nova empresa
        </Link>
      </div>

      {companies.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Building2 className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">Nenhuma empresa ainda</p>
            <p className="text-sm text-muted-foreground">
              Cadastre empresas para gerenciar treinamentos corporativos.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Empresa</th>
                  <th className="px-4 py-3 font-medium">Gestores</th>
                  <th className="px-4 py-3 font-medium">Turmas</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/companies/${c.id}`} className="font-medium hover:underline">
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{c._count.members}</td>
                    <td className="px-4 py-3">{c._count.cohorts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
