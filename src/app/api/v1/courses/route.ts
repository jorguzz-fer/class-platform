import { NextResponse } from "next/server";

import { authenticateApiKey } from "@/lib/api-auth";
import { audit } from "@/lib/audit";
import { apiCourseImportSchema } from "@/lib/validators";
import { upsertCourseTree } from "@/services/course-import.service";
import { onCoursePublished } from "@/services/events.service";

/**
 * REST API pública v1 — import bulk de curso (integração Aulai).
 *
 * Contrato:
 *   POST /api/v1/courses
 *   Header: x-api-key: <chave da escola>
 *   Body:   { sourceRef, title, ..., modules: [{ ..., lessons: [...] }] }
 *   → 200/201 { id }   // upsert idempotente por (organização, sourceRef)
 *
 * Autenticação é por chave de API da organização (máquina-a-máquina): o
 * organizationId vem SEMPRE da chave, nunca do corpo — garante o isolamento
 * multi-tenant mesmo que o cliente tente forjar ids.
 */

// Garante runtime Node (crypto/Prisma) e sem cache de resposta.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const apiCtx = await authenticateApiKey(req);
  if (!apiCtx) {
    return NextResponse.json(
      { error: "Chave de API ausente ou inválida." },
      { status: 401 },
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = apiCourseImportSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Requisição inválida.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  let result;
  try {
    result = await upsertCourseTree(apiCtx.organizationId, parsed.data);
  } catch (e) {
    // Não vaza detalhes internos ao cliente; loga o suficiente para depurar.
    console.error("[api/v1/courses] falha no import:", e);
    return NextResponse.json(
      { error: "Não foi possível processar o curso." },
      { status: 500 },
    );
  }

  await audit({
    organizationId: apiCtx.organizationId,
    userId: null,
    action: result.created ? "api.course.created" : "api.course.updated",
    entityType: "Course",
    entityId: result.id,
    metadata: {
      sourceRef: parsed.data.sourceRef,
      published: result.published,
      apiKeyId: apiCtx.apiKeyId,
    },
  });

  // Dispara o webhook de domínio só quando o curso passa a estar publicado.
  if (result.published) {
    await onCoursePublished(apiCtx.organizationId, result.id);
  }

  return NextResponse.json(
    { id: result.id, published: result.published },
    { status: result.created ? 201 : 200 },
  );
}
