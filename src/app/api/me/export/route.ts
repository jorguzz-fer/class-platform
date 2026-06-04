import { NextResponse } from "next/server";

import { getTenantContext } from "@/lib/tenant";
import { exportUserData } from "@/services/privacy.service";
import { audit } from "@/lib/audit";

/**
 * Exportação dos dados pessoais do usuário logado (portabilidade — LGPD).
 * Retorna um JSON para download. Escopo = usuário da sessão.
 */
export async function GET() {
  const ctx = await getTenantContext();
  if (!ctx) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const data = await exportUserData(ctx.userId);
  if (!data) {
    return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  }

  await audit({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: "user.export_data",
    entityType: "User",
    entityId: ctx.userId,
  });

  return new NextResponse(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="meus-dados-classos.json"',
    },
  });
}
