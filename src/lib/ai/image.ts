/**
 * Geração de imagem por IA (thumbnail de curso) via OpenAI Images.
 *
 * O Claude não gera imagens; usamos um serviço dedicado. Ativado só quando
 * OPENAI_API_KEY está definido. As credenciais ficam no servidor.
 */

export function isImageGenEnabled(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

/**
 * Gera uma imagem (16:9) a partir de um prompt e devolve os bytes (PNG).
 * Lança erro se a key não estiver configurada ou a API falhar.
 */
export async function generateThumbnailImage(prompt: string): Promise<ArrayBuffer> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY não configurada.");

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt,
      size: "1792x1024", // paisagem (~16:9)
      n: 1,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("[ai:image] falha:", res.status, detail.slice(0, 300));
    throw new Error("Falha ao gerar a imagem.");
  }

  const data = (await res.json()) as {
    data?: { b64_json?: string; url?: string }[];
  };
  const item = data.data?.[0];

  // A resposta pode vir como base64 (b64_json) ou como URL temporária,
  // conforme o modelo/conta. Tratamos os dois casos.
  if (item?.b64_json) {
    const buf = Buffer.from(item.b64_json, "base64");
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  }
  if (item?.url) {
    const imgRes = await fetch(item.url);
    if (!imgRes.ok) throw new Error("Falha ao baixar a imagem gerada.");
    return imgRes.arrayBuffer();
  }
  throw new Error("Resposta sem imagem.");
}
