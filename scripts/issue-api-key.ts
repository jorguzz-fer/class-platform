/**
 * Gerencia chaves de API de uma organização (escola).
 *
 * Uso:
 *   pnpm tsx scripts/issue-api-key.ts --school <slug-ou-id> [--name "Aulai"]  # emite
 *   pnpm tsx scripts/issue-api-key.ts --list [--school <slug-ou-id>]          # lista
 *   pnpm tsx scripts/issue-api-key.ts --revoke <id-da-chave>                  # revoga (soft)
 *
 * A emissão exibe o token EM CLARO uma única vez. Ele não é recuperável depois —
 * copie e guarde de forma segura (no Aulai, armazene cifrado no registro da
 * escola). No banco guardamos apenas o hash SHA-256.
 */
import { db } from "@/lib/db";
import { issueApiKey } from "@/services/api-key.service";

function getFlag(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

async function resolveOrg(school: string) {
  // Resolve por slug ou por id — o que casar primeiro.
  const org = await db.organization.findFirst({
    where: { OR: [{ slug: school }, { id: school }] },
    select: { id: true, name: true, slug: true },
  });
  if (!org) {
    console.error(`Organização não encontrada para "${school}".`);
    process.exit(1);
  }
  return org;
}

function fmtKeyLine(k: {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
}): string {
  const status = k.revokedAt
    ? `REVOGADA em ${k.revokedAt.toISOString()}`
    : "ativa";
  const used = k.lastUsedAt
    ? `uso: ${k.lastUsedAt.toISOString()}`
    : "uso: nunca";
  return `  - ${k.prefix}…  "${k.name}"  [${status}]  ${used}  id=${k.id}`;
}

async function listKeys(school?: string) {
  const where = school ? { organizationId: (await resolveOrg(school)).id } : {};
  const keys = await db.apiKey.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      prefix: true,
      lastUsedAt: true,
      revokedAt: true,
      organization: { select: { slug: true } },
    },
  });
  console.error(school ? `Chaves de ${school}:` : "Todas as chaves de API:");
  if (keys.length === 0) {
    console.error("  (nenhuma chave)");
    return;
  }
  for (const k of keys) {
    console.error(fmtKeyLine(k) + (school ? "" : ` org=${k.organization.slug}`));
  }
}

async function revokeKey(id: string) {
  const result = await db.apiKey.updateMany({
    where: { id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (result.count > 0) {
    console.log(`Chave ${id} revogada.`);
    return;
  }
  // Distingue "não existe" de "já estava revogada".
  const existing = await db.apiKey.findUnique({
    where: { id },
    select: { revokedAt: true },
  });
  if (existing) {
    console.log(`Chave ${id} já estava revogada (nada a fazer).`);
  } else {
    console.error(`Chave ${id} não encontrada.`);
    process.exit(1);
  }
}

async function main() {
  const revokeId = getFlag("revoke");
  if (revokeId) {
    await revokeKey(revokeId);
    return;
  }

  const school = getFlag("school");

  if (hasFlag("list")) {
    await listKeys(school);
    return;
  }

  const name = getFlag("name") ?? "Integração";
  if (!school) {
    console.error(
      'Uso: pnpm tsx scripts/issue-api-key.ts --school <slug-ou-id> [--name "Aulai"]\n' +
        "     pnpm tsx scripts/issue-api-key.ts --list [--school <slug-ou-id>]\n" +
        "     pnpm tsx scripts/issue-api-key.ts --revoke <id-da-chave>",
    );
    process.exit(1);
  }

  const org = await resolveOrg(school);
  const { key, prefix, id } = await issueApiKey(org.id, name);

  console.log("");
  console.log(`Chave de API emitida para: ${org.name} (${org.slug})`);
  console.log(`  Rótulo:  ${name}`);
  console.log(`  Id:      ${id}`);
  console.log(`  Prefixo: ${prefix}`);
  console.log("");
  console.log("  TOKEN (copie agora — não será exibido de novo):");
  console.log(`  ${key}`);
  console.log("");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
