import { getTenantContext } from "@/lib/tenant";
import { can } from "@/lib/permissions";
import { listOrgCertificates } from "@/services/certificate.service";
import { formatCpf } from "@/lib/cpf";

// Exporta os certificados da escola em CSV (respeita os filtros via query:
// q, courseId, from, to, attended, operation).

export const dynamic = "force-dynamic";

/** Escapa um campo para CSV (separador ';'). */
function cell(value: string): string {
  const s = value ?? "";
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(request: Request) {
  const ctx = await getTenantContext();
  if (!ctx?.organizationId) {
    return new Response("Não autenticado.", { status: 401 });
  }
  if (!can(ctx.role, "org:view_reports")) {
    return new Response("Sem permissão.", { status: 403 });
  }

  const url = new URL(request.url);
  const filters = {
    q: url.searchParams.get("q") ?? "",
    courseId: url.searchParams.get("courseId") ?? "",
    from: url.searchParams.get("from") ?? "",
    to: url.searchParams.get("to") ?? "",
    attended: url.searchParams.get("attended") ?? "",
    operation: url.searchParams.get("operation") ?? "",
  };

  const certificates = await listOrgCertificates(ctx.organizationId, filters);

  const header = [
    "Aluno",
    "CPF",
    "E-mail",
    "Curso",
    "Operação",
    "Número",
    "Emitido em",
    "Presencial",
    "Data presença",
  ];
  const lines = [header.join(";")];
  for (const c of certificates) {
    lines.push(
      [
        cell(c.student.name),
        cell(formatCpf(c.student.cpf)),
        cell(c.student.email),
        cell(c.course.title),
        cell(c.student.memberships[0]?.operation ?? ""),
        cell(c.certificateNumber),
        cell(c.issuedAt.toLocaleDateString("pt-BR")),
        cell(c.attendedInPerson ? "Sim" : "Não"),
        cell(c.attendedAt ? c.attendedAt.toLocaleDateString("pt-BR") : ""),
      ].join(";"),
    );
  }

  // BOM para o Excel abrir com acentos corretos.
  const csv = "﻿" + lines.join("\r\n") + "\r\n";

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="certificados.csv"',
      "cache-control": "no-store",
    },
  });
}
