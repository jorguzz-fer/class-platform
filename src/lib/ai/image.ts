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
      response_format: "b64_json",
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("[ai:image] falha:", res.status, detail.slice(0, 300));
    throw new Error("Falha ao gerar a imagem.");
  }

  const data = (await res.json()) as { data?: { b64_json?: string }[] };
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error("Resposta sem imagem.");

  const buf = Buffer.from(b64, "base64");
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}
