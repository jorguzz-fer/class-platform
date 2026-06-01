/**
 * Abstração de gateway de pagamento (Fase 2).
 *
 * Seleção por ambiente, sem segredos no código:
 * - Com PAYMENT_PROVIDER + credenciais → provider real (a implementar por gateway).
 * - Caso contrário → provider mock, que cria uma "sessão de checkout" simulada
 *   e confirma o pagamento via uma URL de checkout interna — permite testar todo
 *   o fluxo (incluindo webhook de confirmação) sem custo nem credencial.
 *
 * O contrato é mínimo e provider-agnóstico: criar uma sessão de pagamento para
 * um pedido e validar a assinatura do webhook de confirmação.
 */

export interface CheckoutSessionInput {
  orderId: string;
  amount: number;
  currency: string;
  method: "PIX" | "CARD" | "BOLETO";
  description: string;
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
    // Página de checkout simulada (confirma via POST no webhook interno).
    const checkoutUrl = `${APP_URL}/checkout/order/${input.orderId}/pay`;
    return { checkoutUrl, gatewayRef };
  },
};

function resolveProvider(): PaymentProvider {
  // Espaço para plugar Stripe/Mercado Pago/Pagar.me etc. via env no futuro.
  // Mantém o mock como padrão seguro enquanto não há credenciais.
  return mockPaymentProvider;
}

export const paymentProvider: PaymentProvider = resolveProvider();

export function isRealPaymentEnabled(): boolean {
  return !!process.env.PAYMENT_PROVIDER;
}

/**
 * A confirmação SIMULADA de pagamento (mock) só é permitida quando NENHUM sinal
 * de pagamento real está configurado. Fail-closed: basta `PAYMENT_PROVIDER` OU
 * `PAYMENT_WEBHOOK_SECRET` estarem presentes para desabilitar o mock — evita que
 * um deploy com config parcial deixe um bypass de pagamento aberto.
 */
export function isMockPaymentAllowed(): boolean {
  return !process.env.PAYMENT_PROVIDER && !process.env.PAYMENT_WEBHOOK_SECRET;
}
