import { createHash } from "node:crypto";

import { db } from "./db";

/**
 * Autenticação máquina-a-máquina da REST API pública (Fase: integração Aulai).
 *
 * O cliente envia o token no header `x-api-key`. Guardamos apenas o hash
 * SHA-256 do token (ver model ApiKey); a busca é feita pelo hash, então o valor
 * em claro nunca trafega para o banco nem aparece em logs.
 *
 * SHA-256 (e não bcrypt) é adequado aqui porque o token é gerado pelo servidor
 * com alta entropia (24 bytes aleatórios) — não há senha fraca a proteger
 * contra brute force, e a busca precisa ser por índice único.
 */

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export interface ApiAuthContext {
  organizationId: string;
  apiKeyId: string;
}

/**
 * Resolve a organização a partir do header `x-api-key`. Retorna null se a chave
 * estiver ausente, inválida, revogada, ou se a organização estiver
 * suspensa/cancelada. Atualiza `lastUsedAt` em best-effort.
 */
export async function authenticateApiKey(
  req: Request,
): Promise<ApiAuthContext | null> {
  const key = req.headers.get("x-api-key");
  if (!key) return null;

  const record = await db.apiKey.findUnique({
    where: { keyHash: hashApiKey(key) },
    select: {
      id: true,
      revokedAt: true,
      organization: { select: { id: true, status: true } },
    },
  });

  if (!record || record.revokedAt) return null;
  const status = record.organization.status;
  if (status === "SUSPENDED" || status === "CANCELED") return null;

  // Best-effort: registrar o uso não deve bloquear nem quebrar a requisição.
  db.apiKey
    .update({ where: { id: record.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return { organizationId: record.organization.id, apiKeyId: record.id };
}
