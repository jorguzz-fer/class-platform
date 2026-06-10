import { AwsClient } from "aws4fetch";

/**
 * Storage de arquivos (uploads de material: PDFs de slides, etc.).
 *
 * Implementação para Cloudflare R2 (API compatível com S3) via `aws4fetch`
 * (assinatura SigV4 leve). O upload é feito pelo servidor — as credenciais
 * NUNCA vão para o cliente.
 *
 * Seleção por ambiente, sem segredos no código:
 * - Com as variáveis `R2_*` definidas → envia de verdade para o bucket.
 * - Sem elas → provider "não configurado", que lança erro explícito (e
 *   `isConfigured()` retorna false para a UI orientar o usuário).
 */

export interface StoredFile {
  /** URL pública do objeto (servida pelo bucket/domínio configurado). */
  url: string;
  /** Caminho do objeto dentro do bucket (para remoção posterior). */
  key: string;
}

export interface StorageProvider {
  /** Indica se há um provider real configurado (envs presentes). */
  isConfigured(): boolean;
  /** Envia um objeto e devolve sua URL pública. */
  put(params: {
    key: string;
    body: ArrayBuffer;
    contentType: string;
  }): Promise<StoredFile>;
  /** Remove um objeto pelo seu key (best-effort). */
  delete(key: string): Promise<void>;
}

function createR2Provider(): StorageProvider | null {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  const publicUrl = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
    return null;
  }

  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
  const client = new AwsClient({
    accessKeyId,
    secretAccessKey,
    service: "s3",
    region: "auto",
  });

  function objectUrl(key: string) {
    return `${endpoint}/${bucket}/${encodeURI(key)}`;
  }

  return {
    isConfigured: () => true,

    async put({ key, body, contentType }) {
      const res = await client.fetch(objectUrl(key), {
        method: "PUT",
        body,
        headers: { "content-type": contentType },
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        // Não vaza detalhes do provider ao usuário; loga para diagnóstico.
        console.error("[storage:r2] PUT falhou:", res.status, detail.slice(0, 300));
        throw new Error("Falha ao enviar o arquivo.");
      }
      return { url: `${publicUrl}/${key}`, key };
    },

    async delete(key) {
      const res = await client.fetch(objectUrl(key), { method: "DELETE" });
      if (!res.ok && res.status !== 404) {
        console.error("[storage:r2] DELETE falhou:", res.status);
      }
    },
  };
}

const notConfigured: StorageProvider = {
  isConfigured: () => false,
  async put() {
    throw new Error(
      "Storage não configurado. Defina R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, " +
        "R2_SECRET_ACCESS_KEY, R2_BUCKET e R2_PUBLIC_URL no ambiente.",
    );
  },
  async delete() {
    // sem provider: nada a remover.
  },
};

export const storage: StorageProvider = createR2Provider() ?? notConfigured;
