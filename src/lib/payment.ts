import { resolvePaymentAccount } from "@/services/payment-account.service";
import { createAsaasProvider } from "@/lib/payment/asaas";

/**
 * Abstração de gateway de pagamento — POR TENANT (Fase 2, Asaas).
 *
 * Cada escola pluga a própria conta Asaas (credencial cifrada no banco). O
 * provider é resolvido por organização:
 * - Escola com Asaas configurado e habilitado → provider real (cobra na conta
 *   dela; o dinheiro cai direto para a escola).
 * - Caso contrário → provider mock, que simula o checkout para desenvolvimento.
 *   Em produção o mock é bloqueado (fail-closed): curso pago sem gateway não é
 *   vendido.
 */

export interface CheckoutBuyer {
  id: string;
  name: string;
  email: string;
  cpf: string | null;
}

export interface CheckoutSessionInput {
  orderId: string;
  amount: number;
  currency: string;
  method: "PIX" | "CARD" | "BOLETO";
  description: string;
  buyer: CheckoutBuyer;
}

export interface CheckoutSession {
  /** URL para a qual o comprador é redirecionado para pagar. */
  checkoutUrl: string;
  /** Referência da transação no gateway. */
  gatewayRef: string;
}

export interface PaymentProvider {
  readonly name: string;
  createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSession>;
}

const APP_URL = process.env.AUTH_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

/**
 * Provider mock: o "checkout" é uma página interna que confirma o pagamento.
 * gatewayRef determinístico baseado no orderId para facilitar testes.
 */
const mockPaymentProvider: PaymentProvider = {
  name: "mock",
  async createCheckoutSession(input) {
    const gatewayRef = `mock_${input.orderId}`;
    const checkoutUrl = `${APP_URL}/checkout/order/${input.orderId}/pay`;
    return { checkoutUrl, gatewayRef };
  },
};

export type ResolvedProvider = {
  provider: PaymentProvider;
  /** True quando é um gateway real (cobra de verdade). */
  isReal: boolean;
};

/**
 * Resolve o provider para uma organização. Se a escola configurou a Asaas,
 * usa a conta dela (credencial decifrada em memória, nunca persistida em claro).
 * Caso contrário, cai no mock.
 */
export async function resolveProviderForOrg(
  organizationId: string,
): Promise<ResolvedProvider> {
  const account = await resolvePaymentAccount(organizationId);
  if (account) {
    return {
      provider: createAsaasProvider({
        apiKey: account.apiKey,
        environment: account.environment,
      }),
      isReal: true,
    };
  }
  return { provider: mockPaymentProvider, isReal: false };
}

/**
 * A confirmação SIMULADA de pagamento (mock) só é permitida FORA de produção.
 * Em produção, a confirmação vem sempre pelo webhook do gateway real — nunca
 * por uma ação interna (fail-closed contra bypass de pagamento).
 */
export function isMockPaymentAllowed(): boolean {
  return process.env.NODE_ENV !== "production";
}
