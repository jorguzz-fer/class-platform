/**
 * Interface de storage (stub).
 *
 * No MVP não implementamos upload próprio. Esta abstração define o contrato
 * para um provider futuro (Cloudflare R2, AWS S3 ou Supabase Storage),
 * permitindo trocar a implementação sem mexer no resto do código.
 */

export interface UploadResult {
  url: string;
  key: string;
}

export interface StorageProvider {
  /** Gera uma URL assinada para upload direto do cliente. */
  getSignedUploadUrl(params: {
    key: string;
    contentType: string;
  }): Promise<{ uploadUrl: string; publicUrl: string }>;

  /** Remove um objeto pelo seu key. */
  delete(key: string): Promise<void>;
}

/**
 * Placeholder até configurarmos um provider real.
 * Lança erro explícito para evitar uso acidental antes da implementação.
 */
export const storage: StorageProvider = {
  async getSignedUploadUrl() {
    throw new Error("Storage provider ainda não configurado (MVP).");
  },
  async delete() {
    throw new Error("Storage provider ainda não configurado (MVP).");
  },
};
