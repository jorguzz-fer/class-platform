import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { getTenantContext } from "@/lib/tenant";
import { can } from "@/lib/permissions";
import { storage } from "@/lib/storage";

// Upload de material via servidor (Route Handler, sem o limite de 1 MB das
// Server Actions). Aceita PDF (slides) e imagens (thumbnail do curso). As
// credenciais do storage ficam no servidor; o cliente recebe só a URL pública.

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB

export const dynamic = "force-dynamic";

/**
 * Detecta o tipo do arquivo pela assinatura (magic bytes) — não confia no
 * content-type/extensão enviados pelo cliente. Retorna null se não suportado.
 */
function detectType(bytes: Uint8Array): { ext: string; contentType: string } | null {
  const ascii = (start: number, len: number) =>
    String.fromCharCode(...bytes.slice(start, start + len));

  if (ascii(0, 5) === "%PDF-") return { ext: "pdf", contentType: "application/pdf" };
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47)
    return { ext: "png", contentType: "image/png" };
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return { ext: "jpg", contentType: "image/jpeg" };
  if (ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP")
    return { ext: "webp", contentType: "image/webp" };
  if (ascii(0, 4) === "GIF8") return { ext: "gif", contentType: "image/gif" };
  // ICO (favicon): 00 00 01 00.
  if (bytes[0] === 0x00 && bytes[1] === 0x00 && bytes[2] === 0x01 && bytes[3] === 0x00)
    return { ext: "ico", contentType: "image/x-icon" };
  // SVG (logo): documento XML que contém "<svg" no início.
  const headText = ascii(0, Math.min(bytes.length, 256))
    .replace(/^﻿/, "")
    .toLowerCase();
  if (headText.includes("<svg")) return { ext: "svg", contentType: "image/svg+xml" };
  return null;
}

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
  const type = detectType(new Uint8Array(buffer.slice(0, 256)));
  if (!type) {
    return NextResponse.json(
      { error: "Formato não suportado. Envie PDF, PNG, JPG, WEBP, SVG ou ICO." },
      { status: 415 },
    );
  }

  // Chave isolada por organização; nome aleatório (não vaza o nome original).
  const key = `uploads/${ctx.organizationId}/${randomUUID()}.${type.ext}`;

  try {
    const { url } = await storage.put({
      key,
      body: buffer,
      contentType: type.contentType,
    });
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json(
      { error: "Falha ao enviar o arquivo. Tente novamente." },
      { status: 502 },
    );
  }
}
