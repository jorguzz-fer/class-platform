import { headers } from "next/headers";

/**
 * Best-effort: extrai o IP do cliente dos cabeçalhos de proxy. Usado para
 * accountability de consentimento (LGPD). Retorna null se indisponível.
 * Atrás de proxy reverso (ex.: Coolify/Traefik), `x-forwarded-for` traz o IP real.
 */
export async function getClientIp(): Promise<string | null> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    // Pode conter uma lista "client, proxy1, proxy2" — o primeiro é o cliente.
    return forwarded.split(",")[0]?.trim() || null;
  }
  return h.get("x-real-ip");
}
