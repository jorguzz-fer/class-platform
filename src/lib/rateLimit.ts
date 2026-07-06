import { db } from "@/lib/db";

/**
 * Rate limiting por janela deslizante, persistido em PostgreSQL.
 *
 * Não depende de Redis nem de serviço externo: usa uma tabela `RateLimitHit`
 * auto-criada em runtime (evita uma migration dedicada). Cada tentativa insere
 * uma linha; a contagem na janela decide se a ação é permitida.
 *
 * Uso típico (chave dupla IP + identidade) — ver `authorize`/actions de auth:
 *   const r = await rateLimit({ key: `login:ip:${ip}`, windowSec: 900, max: 10 });
 *   if (!r.allowed) return { error: "Muitas tentativas. Aguarde." };
 *
 * NOTA: se preferir formalizar, declare o model `RateLimitHit` no schema.prisma
 * e troque o auto-CREATE por uma migration. O comportamento em runtime é o mesmo.
 */

interface RateLimitOptions {
  /** Identificador do bucket, ex.: `login:email:foo@bar.com`. */
  key: string;
  /** Tamanho da janela em segundos. */
  windowSec: number;
  /** Máximo de tentativas permitidas na janela. */
  max: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
}

export async function rateLimit({
  key,
  windowSec,
  max,
}: RateLimitOptions): Promise<RateLimitResult> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowSec * 1000);

  try {
    // Auto-cria tabela/índice na primeira execução — idempotente.
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "RateLimitHit" (
        "id" SERIAL PRIMARY KEY,
        "key" TEXT NOT NULL,
        "hitAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS "RateLimitHit_key_hitAt_idx" ON "RateLimitHit"("key", "hitAt");
    `);

    // GC periódico: remove hits com mais de 24h para a tabela não crescer sem fim.
    await db.$executeRawUnsafe(
      `DELETE FROM "RateLimitHit" WHERE "hitAt" < $1`,
      new Date(now.getTime() - 24 * 60 * 60 * 1000),
    );

    const countRows = await db.$queryRawUnsafe<{ count: bigint }[]>(
      `SELECT COUNT(*)::bigint AS count FROM "RateLimitHit" WHERE "key" = $1 AND "hitAt" > $2`,
      key,
      windowStart,
    );
    const count = Number(countRows[0]?.count ?? 0);

    if (count >= max) {
      const oldestRows = await db.$queryRawUnsafe<{ hitAt: Date }[]>(
        `SELECT "hitAt" FROM "RateLimitHit" WHERE "key" = $1 AND "hitAt" > $2 ORDER BY "hitAt" ASC LIMIT 1`,
        key,
        windowStart,
      );
      const oldest = oldestRows[0]?.hitAt ?? now;
      const retryAfterSec = Math.max(
        1,
        Math.ceil((oldest.getTime() + windowSec * 1000 - now.getTime()) / 1000),
      );
      return { allowed: false, remaining: 0, retryAfterSec };
    }

    await db.$executeRawUnsafe(
      `INSERT INTO "RateLimitHit"("key", "hitAt") VALUES ($1, $2)`,
      key,
      now,
    );

    return { allowed: true, remaining: max - count - 1, retryAfterSec: 0 };
  } catch (err) {
    // Fail-open: se o banco estiver indisponível, não derruba o fluxo de login.
    // (Trocar para fail-closed se a política exigir bloqueio na dúvida.)
    console.error("[rateLimit] erro", err);
    return { allowed: true, remaining: 0, retryAfterSec: 0 };
  }
}
