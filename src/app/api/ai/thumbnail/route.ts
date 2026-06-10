import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { getTenantContext } from "@/lib/tenant";
import { can } from "@/lib/permissions";
import { storage } from "@/lib/storage";
import { getOrgPlan } from "@/services/school.service";
import { generateThumbnailImage, isImageGenEnabled } from "@/lib/ai/image";

// Gera a thumbnail do curso por IA (OpenAI Images), guarda no storage e devolve
// a URL pública. Server-side: as credenciais nunca vão ao cliente.

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const ctx = await getTenantContext();
  if (!ctx?.organizationId) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  if (!can(ctx.role, "course:edit") && !can(ctx.role, "course:edit_own")) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const plan = await getOrgPlan(ctx.organizationId);
  if (!plan?.hasAiFeatures) {
    return NextResponse.json(
      { error: "Recursos de IA não estão disponíveis no seu plano." },
      { status: 403 },
    );
  }
  if (!isImageGenEnabled()) {
    return NextResponse.json(
      { error: "Geração de imagem indisponível: configure OPENAI_API_KEY." },
      { status: 503 },
    );
  }
  if (!storage.isConfigured()) {
    return NextResponse.json(
      { error: "Storage não configurado no servidor." },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    title?: string;
    subtitle?: string;
  };
  const title = (body.title ?? "").trim().slice(0, 200);
  if (title.length < 2) {
    return NextResponse.json(
      { error: "Informe o título do curso antes de gerar a imagem." },
      { status: 400 },
    );
  }
  const subtitle = (body.subtitle ?? "").trim().slice(0, 200);

  const prompt =
    `Capa de curso online profissional e moderna sobre "${title}".` +
    (subtitle ? ` Tema: ${subtitle}.` : "") +
    " Ilustração limpa e atraente, cores agradáveis, composição em paisagem 16:9. " +
    "NÃO inclua texto, letras ou palavras na imagem.";

  try {
    const image = await generateThumbnailImage(prompt);
    const { url } = await storage.put({
      key: `uploads/${ctx.organizationId}/${randomUUID()}.png`,
      body: image,
      contentType: "image/png",
    });
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível gerar a imagem. Tente novamente." },
      { status: 502 },
    );
  }
}
