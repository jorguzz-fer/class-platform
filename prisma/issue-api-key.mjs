// Emissor de chave de API em JS puro (ESM) — roda com `node` tanto em dev quanto
// na imagem de PRODUÇÃO (que tem node + a pasta prisma/, mas NÃO tem tsx nem a
// pasta scripts/). Mesma estratégia do seed.mjs.
//
// Uso:
//   node prisma/issue-api-key.mjs --school <slug-ou-id> [--name "Aulai"]  # emite
//   node prisma/issue-api-key.mjs --list [--school <slug-ou-id>]          # lista chaves
//   node prisma/issue-api-key.mjs --revoke <id-da-chave>                  # revoga (soft)
//   node prisma/issue-api-key.mjs                  # sem args: lista as escolas
//
// Exibe o token EM CLARO uma única vez (não é recuperável). No banco guardamos
// só o hash SHA-256 — o mesmo algoritmo de src/lib/api-auth.ts (hashApiKey).
// Mantenha os dois em sincronia: token = "clsk_" + 24 bytes aleatórios (hex);
// hash = sha256(token) em hex.
import { randomBytes, createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

function getFlag(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

async function listOrganizations() {
  const orgs = await db.organization.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, slug: true, name: true, status: true },
  });
  if (orgs.length === 0) {
    console.error(
      "Nenhuma organização encontrada. Crie uma escola em /register primeiro.",
    );
    return;
  }
  console.error("Escolas disponíveis (use o slug ou o id em --school):");
  for (const o of orgs) {
    console.error(`  - ${o.slug}  (${o.name})  [${o.status}]  id=${o.id}`);
  }
}

function fmtKeyLine(k) {
  const status = k.revokedAt
    ? `REVOGADA em ${k.revokedAt.toISOString()}`
    : "ativa";
  const used = k.lastUsedAt
    ? `uso: ${k.lastUsedAt.toISOString()}`
    : "uso: nunca";
  return `  - ${k.prefix}…  "${k.name}"  [${status}]  ${used}  id=${k.id}`;
}

async function listKeys(school) {
  let where = {};
  if (school) {
    const org = await db.organization.findFirst({
      where: { OR: [{ slug: school }, { id: school }] },
      select: { id: true, name: true, slug: true },
    });
    if (!org) {
      console.error(`Organização não encontrada para "${school}".\n`);
      await listOrganizations();
      process.exit(1);
    }
    where = { organizationId: org.id };
    console.error(`Chaves de ${org.name} (${org.slug}):`);
  } else {
    console.error("Todas as chaves de API:");
  }

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
  if (keys.length === 0) {
    console.error("  (nenhuma chave)");
    return;
  }
  for (const k of keys) {
    const org = school ? "" : ` org=${k.organization.slug}`;
    console.error(fmtKeyLine(k) + org);
  }
}

async function revokeKey(id) {
  const result = await db.apiKey.updateMany({
    where: { id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (result.count > 0) {
    console.log(`Chave ${id} revogada.`);
  } else {
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
}

async function main() {
  const school = getFlag("school");
  const name = getFlag("name") ?? "Aulai";

  const revokeId = getFlag("revoke");
  if (revokeId) {
    await revokeKey(revokeId);
    return;
  }

  if (hasFlag("list")) {
    await listKeys(school);
    return;
  }

  if (!school) {
    console.error(
      'Uso: node prisma/issue-api-key.mjs --school <slug-ou-id> [--name "Aulai"]\n',
    );
    await listOrganizations();
    process.exit(1);
  }

  const org = await db.organization.findFirst({
    where: { OR: [{ slug: school }, { id: school }] },
    select: { id: true, name: true, slug: true },
  });
  if (!org) {
    console.error(`Organização não encontrada para "${school}".\n`);
    await listOrganizations();
    process.exit(1);
  }

  const key = "clsk_" + randomBytes(24).toString("hex");
  const prefix = key.slice(0, 11); // "clsk_" + 6
  const keyHash = createHash("sha256").update(key).digest("hex");

  const record = await db.apiKey.create({
    data: { organizationId: org.id, name, prefix, keyHash },
    select: { id: true },
  });

  console.log("");
  console.log(`Chave de API emitida para: ${org.name} (${org.slug})`);
  console.log(`  Rótulo:  ${name}`);
  console.log(`  Id:      ${record.id}`);
  console.log(`  Prefixo: ${prefix}`);
  console.log("");
  console.log("  TOKEN (copie agora — não será exibido de novo):");
  console.log(`  ${key}`);
  console.log("");
}

main()
  .then(() => db.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await db.$disconnect();
    process.exit(1);
  });
