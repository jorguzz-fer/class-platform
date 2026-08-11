import type {
  CheckoutSession,
  CheckoutSessionInput,
  PaymentProvider,
} from "@/lib/payment";

/**
 * Provider Asaas (por tenant). Recebe a API Key JÁ DECIFRADA da escola e cobra
 * na conta Asaas dela — o dinheiro cai direto para a escola.
 *
 * Fluxo: garante um cliente (customer) na conta Asaas a partir do CPF do
 * comprador, cria uma cobrança (payment) e devolve a `invoiceUrl` (página de
 * pagamento hospedada pela Asaas) + o id da cobrança como gatewayRef.
 *
 * A confirmação NÃO acontece aqui: a Asaas chama nosso webhook quando o
 * pagamento é confirmado, e é lá que liberamos o acesso.
 */

type AsaasConfig = {
  apiKey: string;
  environment: "SANDBOX" | "PRODUCTION";
};

const BASE_URL: Record<AsaasConfig["environment"], string> = {
  SANDBOX: "https://sandbox.asaas.com/api/v3",
  PRODUCTION: "https://api.asaas.com/v3",
};

const BILLING_TYPE: Record<CheckoutSessionInput["method"], string> = {
  PIX: "PIX",
  BOLETO: "BOLETO",
  CARD: "CREDIT_CARD",
};

/** Vencimento padrão da cobrança: hoje + N dias, no formato YYYY-MM-DD. */
function dueDateISO(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}

export function createAsaasProvider(config: AsaasConfig): PaymentProvider {
  const base = BASE_URL[config.environment];

  async function call<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${base}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        access_token: config.apiKey,
        "User-Agent": "ClassOS",
        ...(init?.headers ?? {}),
      },
      // Cobrança é sempre server-side; nunca cacheia.
      cache: "no-store",
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    if (!res.ok) {
      const msg =
        data?.errors?.[0]?.description ?? `Asaas respondeu ${res.status}.`;
      throw new Error(msg);
    }
    return data as T;
  }

  /** Reaproveita o cliente pelo CPF; cria se não existir. */
  async function ensureCustomer(buyer: CheckoutSessionInput["buyer"]): Promise<string> {
    const cpf = buyer.cpf?.replace(/\D/g, "");
    if (cpf) {
      const found = await call<{ data?: Array<{ id: string }> }>(
        `/customers?cpfCnpj=${cpf}`,
      );
      if (found.data && found.data.length > 0) return found.data[0].id;
    }
    const created = await call<{ id: string }>(`/customers`, {
      method: "POST",
      body: JSON.stringify({
        name: buyer.name,
        email: buyer.email,
        cpfCnpj: cpf || undefined,
        externalReference: buyer.id,
      }),
    });
    return created.id;
  }

  return {
    name: "asaas",
    async createCheckoutSession(input): Promise<CheckoutSession> {
      const customer = await ensureCustomer(input.buyer);
      const payment = await call<{ id: string; invoiceUrl: string }>(`/payments`, {
        method: "POST",
        body: JSON.stringify({
          customer,
          billingType: BILLING_TYPE[input.method],
          value: input.amount,
          dueDate: dueDateISO(3),
          description: input.description,
          externalReference: input.orderId,
        }),
      });
      return { checkoutUrl: payment.invoiceUrl, gatewayRef: payment.id };
    },
  };
}
