import { Award } from "lucide-react";

import { requireOrg } from "@/lib/tenant";
import { listOrgCertificates } from "@/services/certificate.service";
import { Card, CardContent } from "@/components/ui/card";

export default async function DashboardCertificatesPage() {
  const { organizationId } = await requireOrg();
  const certificates = await listOrgCertificates(organizationId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Certificados</h1>
        <p className="text-muted-foreground">
          Certificados emitidos pelos alunos da sua escola.
        </p>
      </div>

      {certificates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Award className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">Nenhum certificado emitido</p>
            <p className="text-sm text-muted-foreground">
              Certificados aparecem aqui quando alunos concluem cursos.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Aluno</th>
                  <th className="px-4 py-3 font-medium">Curso</th>
                  <th className="px-4 py-3 font-medium">Número</th>
                  <th className="px-4 py-3 font-medium">Emitido em</th>
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
