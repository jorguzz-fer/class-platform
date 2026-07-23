import { getTenantContext } from "@/lib/tenant";
import { can } from "@/lib/permissions";
import { listEnrollments } from "@/services/enrollment.service";
import { formatCpf } from "@/lib/cpf";

// Exporta as matrículas da escola em CSV (respeita busca/status via query).

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Ativa",
  COMPLETED: "Concluída",
  EXPIRED: "Expirada",
  CANCELED: "Cancelada",
  PENDING: "Pendente",
};

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
  const q = url.searchParams.get("q") ?? "";
  const status = url.searchParams.get("status") ?? "";

  const enrollments = await listEnrollments(ctx.organizationId, { q, status });

  const header = ["Aluno", "CPF", "E-mail", "Curso", "Status", "Matriculado em"];
  const lines = [header.join(";")];
  for (const e of enrollments) {
    lines.push(
      [
        cell(e.student.name),
        cell(formatCpf(e.student.cpf)),
        cell(e.student.email),
        cell(e.course.title),
        cell(STATUS_LABEL[e.status] ?? e.status),
        cell(e.enrolledAt.toLocaleDateString("pt-BR")),
      ].join(";"),
    );
  }

  // BOM para o Excel abrir com acentos corretos.
  const csv = "﻿" + lines.join("\r\n") + "\r\n";

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="matriculas.csv"',
      "cache-control": "no-store",
    },
  });
}
