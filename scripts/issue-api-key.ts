/**
 * Emite uma chave de API para uma organização (escola).
 *
 * Uso:
 *   pnpm tsx scripts/issue-api-key.ts --school <slug-ou-id> [--name "Aulai"]
 *
 * Exibe o token EM CLARO uma única vez. Ele não é recuperável depois — copie e
 * guarde de forma segura (no Aulai, armazene cifrado no registro da escola).
 * No banco guardamos apenas o hash SHA-256.
 */
import { db } from "@/lib/db";
import { issueApiKey } from "@/services/api-key.service";

function getFlag(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const school = getFlag("school");
  const name = getFlag("name") ?? "Integração";

  if (!school) {
    console.error(
      "Uso: pnpm tsx scripts/issue-api-key.ts --school <slug-ou-id> [--name \"Aulai\"]",
    );
    process.exit(1);
  }

  // Resolve por slug ou por id — o que casar primeiro.
  const org = await db.organization.findFirst({
    where: { OR: [{ slug: school }, { id: school }] },
    select: { id: true, name: true, slug: true },
  });
  if (!org) {
    console.error(`Organização não encontrada para "${school}".`);
    process.exit(1);
  }

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
