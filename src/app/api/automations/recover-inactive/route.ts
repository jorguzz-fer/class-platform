import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { recoverInactiveStudents } from "@/services/automation.service";

/**
 * Dispara a recuperação de alunos inativos de uma organização.
 * Pensado para ser chamado por um cron/n8n. Protegido por CRON_SECRET no header
 * Authorization: Bearer <secret>. Se CRON_SECRET não estiver configurado, a rota
 * é desabilitada (retorna 503) para não ficar aberta por engano.
 */
const bodySchema = z.object({
  organizationId: z.string().min(1),
  inactiveDays: z.number().int().min(1).max(365).optional(),
});

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Automação não configurada (defina CRON_SECRET)." },
      { status: 503 },
    );
  }

  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  // Confirma que a organização existe e está ativa.
  const org = await db.organization.findUnique({
    where: { id: parsed.data.organizationId },
    select: { status: true },
  });
  if (!org || org.status === "SUSPENDED" || org.status === "CANCELED") {
    return NextResponse.json({ error: "Organização indisponível." }, { status: 404 });
  }

  const notified = await recoverInactiveStudents(
    parsed.data.organizationId,
    parsed.data.inactiveDays,
  );

  return NextResponse.json({ ok: true, notified });
}
