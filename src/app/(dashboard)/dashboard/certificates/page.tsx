import { Award, Download } from "lucide-react";

import { requireOrg } from "@/lib/tenant";
import { can } from "@/lib/permissions";
import {
  listOrgCertificates,
  listCertificateCourses,
} from "@/services/certificate.service";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { CertificateFilters } from "@/components/dashboard/certificate-filters";
import { CertificateAttendanceToggle } from "@/components/dashboard/certificate-attendance-toggle";
import { cn } from "@/lib/utils";

export default async function DashboardCertificatesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    courseId?: string;
    from?: string;
    to?: string;
    attended?: string;
  }>;
}) {
  const ctx = await requireOrg();
  const { q = "", courseId = "", from = "", to = "", attended = "" } =
    await searchParams;
  const filters = { q, courseId, from, to, attended };
  const hasFilters = Object.values(filters).some((v) => v !== "");

  const [certificates, courses] = await Promise.all([
    listOrgCertificates(ctx.organizationId, filters),
    listCertificateCourses(ctx.organizationId),
  ]);

  const canManage = can(ctx.role, "enrollment:manage");
  const canExport = can(ctx.role, "org:view_reports");

  const exportParams = new URLSearchParams();
  if (q.trim()) exportParams.set("q", q.trim());
  if (courseId) exportParams.set("courseId", courseId);
  if (from) exportParams.set("from", from);
  if (to) exportParams.set("to", to);
  if (attended) exportParams.set("attended", attended);
  const exportHref = `/api/reports/certificates${
    exportParams.toString() ? `?${exportParams.toString()}` : ""
  }`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Certificados</h1>
          <p className="text-muted-foreground">
            Certificados emitidos pelos alunos da sua escola.
          </p>
        </div>
        {canExport && (
          <a
            href={exportHref}
            className={cn(buttonVariants({ variant: "outline" }), "w-fit gap-2")}
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </a>
        )}
      </div>

      <CertificateFilters
        q={q}
        courseId={courseId}
        from={from}
        to={to}
        attended={attended}
        courses={courses}
      />

      {certificates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Award className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">
              {hasFilters
                ? "Nenhum certificado encontrado"
                : "Nenhum certificado emitido"}
            </p>
            <p className="text-sm text-muted-foreground">
              {hasFilters
                ? "Ajuste os filtros para ver outros resultados."
                : "Certificados aparecem aqui quando alunos concluem cursos."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="border-b text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Aluno</th>
                  <th className="px-4 py-3 font-medium">Curso</th>
                  <th className="px-4 py-3 font-medium">Número</th>
                  <th className="px-4 py-3 font-medium">Emitido em</th>
                  <th className="px-4 py-3 font-medium">Presencial</th>
                </tr>
              </thead>
              <tbody>
                {certificates.map((cert) => (
                  <tr key={cert.id} className="border-b last:border-0">
                    <td className="px-4 py-3">{cert.student.name}</td>
                    <td className="px-4 py-3">{cert.course.title}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {cert.certificateNumber}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {cert.issuedAt.toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3">
                      {canManage ? (
                        <CertificateAttendanceToggle
                          certificateId={cert.id}
                          attended={cert.attendedInPerson}
                          attendedAt={
                            cert.attendedAt
                              ? cert.attendedAt.toLocaleDateString("pt-BR")
                              : null
                          }
                        />
                      ) : cert.attendedInPerson ? (
                        <span className="text-sm">
                          Presente
                          {cert.attendedAt
                            ? ` • ${cert.attendedAt.toLocaleDateString("pt-BR")}`
                            : ""}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </td>
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
