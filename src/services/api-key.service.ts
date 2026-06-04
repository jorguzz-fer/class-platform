import { randomBytes } from "node:crypto";

import { db } from "@/lib/db";
import { hashApiKey } from "@/lib/api-auth";

/**
 * Serviço de chaves de API por organização. Toda função é escopada por
 * organizationId. O token em claro só existe no retorno de `issueApiKey` —
 * persistimos apenas o hash.
 */

const KEY_PREFIX = "clsk_"; // "ClassOS key"

/**
 * Emite uma nova chave para a organização. Retorna o token em claro UMA ÚNICA
 * vez (não há como recuperá-lo depois). Quem chama é responsável por exibi-lo
 * ao usuário e nunca persisti-lo.
 */
export async function issueApiKey(organizationId: string, name: string) {
  const key = KEY_PREFIX + randomBytes(24).toString("hex");
  const prefix = key.slice(0, KEY_PREFIX.length + 6);

  const record = await db.apiKey.create({
    data: { organizationId, name, prefix, keyHash: hashApiKey(key) },
    select: { id: true, prefix: true, createdAt: true },
  });

  return { ...record, key };
}

export function listApiKeys(organizationId: string) {
  return db.apiKey.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      prefix: true,
      lastUsedAt: true,
      revokedAt: true,
      createdAt: true,
    },
  });
}

/** Revoga (soft-delete) uma chave da organização. Idempotente. */
export async function revokeApiKey(organizationId: string, apiKeyId: string) {
  const result = await db.apiKey.updateMany({
    where: { id: apiKeyId, organizationId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return result.count > 0;
}
