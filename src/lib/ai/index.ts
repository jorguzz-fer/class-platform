import type { AIProvider } from "./types";
import { MockAIProvider } from "./mock-provider";
import { AnthropicAIProvider } from "./anthropic-provider";

/**
 * Seleciona o provider de IA por ambiente, sem segredos no código:
 * - Com ANTHROPIC_API_KEY definido → Claude (respostas reais).
 * - Sem a key → provider mock (respostas simuladas; zero custo/credencial).
 */
let cached: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (cached) return cached;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  cached = apiKey ? new AnthropicAIProvider(apiKey) : new MockAIProvider();
  return cached;
}

/** Indica se a IA real está habilitada (para a UI sinalizar). */
export function isAIEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export * from "./types";
