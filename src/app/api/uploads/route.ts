import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { getTenantContext } from "@/lib/tenant";
import { can } from "@/lib/permissions";
import { storage } from "@/lib/storage";

// Upload de material via servidor (Route Handler, sem o limite de 1 MB das
// Server Actions). Hoje aceita apenas PDF (slides). As credenciais do storage
// ficam no servidor; o cliente recebe só a URL pública resultante.

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB
const PDF_MAGIC = "%PDF-";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // Autorização: membro da equipe com permissão de editar curso.
  const ctx = await getTenantContext();
  if (!ctx?.organizationId) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  if (!can(ctx.role, "course:edit") && !can(ctx.role, "course:edit_own")) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  if (!storage.isConfigured()) {
    return NextResponse.json(
      { error: "Upload indisponível: storage não configurado no servidor." },
      { status: 503 },
    );
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Arquivo ausente." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Arquivo muito grande (máx. 20 MB)." },
      { status: 413 },
    );
  }

  const buffer = await file.arrayBuffer();

  // Valida que é mesmo um PDF (assinatura nos primeiros bytes) — não confia só
  // no content-type/extensão enviados pelo cliente.
  const head = new TextDecoder("latin1").decode(buffer.slice(0, 5));
  if (file.type !== "application/pdf" || head !== PDF_MAGIC) {
    return NextResponse.json(
      { error: "Envie um arquivo PDF." },
      { status: 415 },
    );
  }

  // Chave isolada por organização; nome aleatório (não vaza o nome original).
  const key = `uploads/${ctx.organizationId}/${randomUUID()}.pdf`;

  try {
    const { url } = await storage.put({
      key,
      body: buffer,
      contentType: "application/pdf",
    });
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json(
      { error: "Falha ao enviar o arquivo. Tente novamente." },
      { status: 502 },
    );
  }
}
