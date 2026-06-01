import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { requireOrg } from "@/lib/tenant";
import { can } from "@/lib/permissions";
import {
  getCompany,
  listCompanyManagers,
  listCohorts,
} from "@/services/company.service";
import { listEnrollableCourses } from "@/services/course.service";
import { CompanyDetail } from "@/components/dashboard/company-detail";

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const ctx = await requireOrg();
  if (!can(ctx.role, "org:manage_team")) redirect("/dashboard");

  const company = await getCompany(ctx.organizationId, companyId);
  if (!company) notFound();

  const [managers, cohorts, courses] = await Promise.all([
    listCompanyManagers(ctx.organizationId, companyId),
    listCohorts(ctx.organizationId, companyId),
    listEnrollableCourses(ctx.organizationId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          href="/dashboard/companies"
          className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Empresas
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">{company.name}</h1>
        {company.contactEmail && (
          <p className="text-muted-foreground">{company.contactEmail}</p>
        )}
      </div>

      <CompanyDetail
        companyId={companyId}
        managers={managers.map((m) => ({ id: m.id, user: m.user }))}
        cohorts={cohorts.map((c) => ({
          id: c.id,
          name: c.name,
          courseTitle: c.course.title,
          members: c._count.members,
        }))}
        courses={courses}
      />
    </div>
  );
}
