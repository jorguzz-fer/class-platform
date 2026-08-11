import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

/**
 * Cofre de credenciais (AES-256-GCM) para segredos por tenant — ex.: a API Key
 * da conta Asaas de cada escola. Nunca guardamos a chave em texto puro no banco.
 *
 * A chave-mestra vem de `CREDENTIALS_SECRET` (env do servidor, nunca no código).
 * Derivamos 32 bytes via scrypt com um salt fixo do app — o segredo em si é o
 * material sensível; o salt fixo só normaliza o tamanho. Formato do texto
 * cifrado: base64( iv(12) | authTag(16) | ciphertext ), com prefixo "v1:".
 */

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;
const PREFIX = "v1:";
// Salt fixo do app: a entropia real está em CREDENTIALS_SECRET.
const KDF_SALT = "classos.credentials.v1";

let cachedKey: Buffer | null = null;

/** True se o cofre pode operar (segredo-mestra configurado). */
export function isVaultConfigured(): boolean {
  return !!process.env.CREDENTIALS_SECRET && process.env.CREDENTIALS_SECRET.length >= 16;
}

function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const secret = process.env.CREDENTIALS_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "CREDENTIALS_SECRET ausente ou curto (mín. 16 chars). Configure no servidor.",
    );
  }
  cachedKey = scryptSync(secret, KDF_SALT, 32);
  return cachedKey;
}

/** Cifra um texto (ex.: API key). Retorna string opaca com prefixo de versão. */
export function encryptSecret(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, ct]).toString("base64");
}

/** Decifra um texto produzido por `encryptSecret`. Lança se adulterado. */
export function decryptSecret(payload: string): string {
  if (!payload.startsWith(PREFIX)) {
    throw new Error("Formato de segredo desconhecido.");
  }
  const raw = Buffer.from(payload.slice(PREFIX.length), "base64");
  const iv = raw.subarray(0, IV_LEN);
  const tag = raw.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ct = raw.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}

/** Máscara para exibir uma chave sem revelá-la (ex.: "••••••••abcd"). */
export function maskSecret(plaintext: string): string {
  const tail = plaintext.slice(-4);
  return "•".repeat(8) + tail;
}
