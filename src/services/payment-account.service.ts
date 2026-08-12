import { randomBytes } from "node:crypto";

import { db } from "@/lib/db";
import {
  decryptSecret,
  encryptSecret,
  isVaultConfigured,
  maskSecret,
} from "@/lib/crypto-vault";

/**
 * Conta de pagamento POR TENANT (Asaas). Cada escola pluga a própria API Key,
 * cifrada no banco. O dinheiro cai direto na conta Asaas da escola — a
 * plataforma não intermedia o fluxo financeiro.
 */

export type PaymentAccountView = {
  provider: "ASAAS";
  environment: "SANDBOX" | "PRODUCTION";
  enabled: boolean;
  /** Chave mascarada para exibir (nunca a chave real). null se não configurada. */
  apiKeyMasked: string | null;
  webhookToken: string;
  /** True quando dá para cobrar de verdade (chave presente + habilitada). */
  ready: boolean;
};

/** Garante que a org tenha um registro (cria com um webhookToken novo). */
async function ensureAccount(organizationId: string) {
  const existing = await db.paymentAccount.findUnique({ where: { organizationId } });
  if (existing) return existing;
  return db.paymentAccount.create({
    data: { organizationId, webhookToken: randomBytes(24).toString("hex") },
  });
}

/** Visão para a tela de configurações (sem expor a chave). */
export async function getPaymentAccountView(
  organizationId: string,
): Promise<PaymentAccountView> {
  const acc = await ensureAccount(organizationId);
  let apiKeyMasked: string | null = null;
  if (acc.apiKeyEnc && isVaultConfigured()) {
    try {
      apiKeyMasked = maskSecret(decryptSecret(acc.apiKeyEnc));
    } catch {
      apiKeyMasked = "•••• (erro ao ler)";
    }
  }
  return {
    provider: "ASAAS",
    environment: acc.environment,
    enabled: acc.enabled,
    apiKeyMasked,
    webhookToken: acc.webhookToken,
    ready: acc.enabled && !!acc.apiKeyEnc && isVaultConfigured(),
  };
}

export type SaveAccountInput = {
  environment: "SANDBOX" | "PRODUCTION";
  enabled: boolean;
  /** Nova API key em texto puro. undefined/"" = manter a atual. */
  apiKey?: string;
};

export type SaveAccountResult = { ok: true } | { ok: false; error: string };

/** Salva a configuração de pagamento da escola (cifra a chave nova, se houver). */
export async function savePaymentAccount(
  organizationId: string,
  input: SaveAccountInput,
): Promise<SaveAccountResult> {
  const acc = await ensureAccount(organizationId);

  let apiKeyEnc = acc.apiKeyEnc;
  const rawKey = input.apiKey?.trim();
  if (rawKey) {
    if (!isVaultConfigured()) {
      return {
        ok: false,
        error:
          "Cofre de credenciais indisponível: configure CREDENTIALS_SECRET no servidor.",
      };
    }
    // Remove espaços e caracteres invisíveis (zero-width, BOM) que costumam
    // vir junto ao colar. A chave da Asaas é ASCII imprimível sem espaços — se
    // sobrar algo fora disso, é erro de cópia (ex.: caractere acentuado oculto)
    // e recusamos, pois iria quebrar o header HTTP na hora de cobrar.
    const cleanKey = rawKey.replace(/[\s​-‍﻿]/g, "");
    if (!/^[\x21-\x7E]+$/.test(cleanKey)) {
      return {
        ok: false,
        error:
          "A API Key contém caracteres inválidos (provável erro ao copiar). Copie a chave novamente direto do painel da Asaas e cole sem espaços.",
      };
    }
    apiKeyEnc = encryptSecret(cleanKey);
  }

  // Não deixa habilitar sem chave configurada (evita cobrança quebrada).
  if (input.enabled && !apiKeyEnc) {
    return { ok: false, error: "Informe a API Key da Asaas antes de habilitar." };
  }

  await db.paymentAccount.update({
    where: { organizationId },
    data: { environment: input.environment, enabled: input.enabled, apiKeyEnc },
  });
  return { ok: true };
}

export type ResolvedPaymentAccount = {
  apiKey: string;
  environment: "SANDBOX" | "PRODUCTION";
  webhookToken: string;
};

/**
 * Config pronta para COBRAR (chave decifrada). null se a escola não configurou
 * ou não habilitou — nesse caso o curso pago não pode ser vendido.
 */
export async function resolvePaymentAccount(
  organizationId: string,
): Promise<ResolvedPaymentAccount | null> {
  const acc = await db.paymentAccount.findUnique({ where: { organizationId } });
  if (!acc || !acc.enabled || !acc.apiKeyEnc || !isVaultConfigured()) return null;
  try {
    return {
      apiKey: decryptSecret(acc.apiKeyEnc),
      environment: acc.environment,
      webhookToken: acc.webhookToken,
    };
  } catch {
    return null;
  }
}

/** Token do webhook da org (para validar o header do gateway). */
export async function getWebhookToken(organizationId: string): Promise<string | null> {
  const acc = await db.paymentAccount.findUnique({
    where: { organizationId },
    select: { webhookToken: true },
  });
  return acc?.webhookToken ?? null;
}

/** True se a escola tem gateway pronto para vender cursos pagos. */
export async function isStoreReady(organizationId: string): Promise<boolean> {
  return (await resolvePaymentAccount(organizationId)) !== null;
}
