/**
 * Abstração de envio por WhatsApp (Fase 5).
 *
 * Seleção por ambiente, sem segredos no código:
 * - Com WHATSAPP_API_URL + WHATSAPP_API_TOKEN → envia via API HTTP genérica
 *   (compatível com gateways como Z-API, Twilio-like, ou um fluxo n8n).
 * - Caso contrário → provider de desenvolvimento, que apenas loga no servidor
 *   (nunca em produção; nunca em respostas HTTP).
 *
 * Nunca logamos o número completo: mascaramos para não expor PII.
 */

export interface WhatsAppMessage {
  to: string; // telefone E.164
  text: string;
}

export interface WhatsAppProvider {
  readonly name: string;
  send(message: WhatsAppMessage): Promise<void>;
}

/** Mascarar telefone para logs (mantém DDI/DDD e os 2 últimos dígitos). */
function maskPhone(phone: string): string {
  if (phone.length <= 4) return "***";
  return phone.slice(0, 4) + "****" + phone.slice(-2);
}

const devWhatsAppProvider: WhatsAppProvider = {
  name: "dev",
  async send(message) {
    if (process.env.NODE_ENV !== "production") {
      console.info(
        `[whatsapp:dev] para=${maskPhone(message.to)} texto="${message.text.slice(0, 80)}"`,
      );
    }
  },
};

function createHttpWhatsAppProvider(url: string, token: string): WhatsAppProvider {
  return {
    name: "http",
    async send(message) {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ to: message.to, text: message.text }),
      });
      if (!res.ok) {
        // Não vaza o corpo (pode conter dados); loga status apenas.
        console.error(`[whatsapp:http] falha status=${res.status}`);
        throw new Error("Falha ao enviar WhatsApp.");
      }
    },
  };
}

function resolveProvider(): WhatsAppProvider {
  const url = process.env.WHATSAPP_API_URL;
  const token = process.env.WHATSAPP_API_TOKEN;
  if (url && token) return createHttpWhatsAppProvider(url, token);
  return devWhatsAppProvider;
}

export const whatsAppProvider: WhatsAppProvider = resolveProvider();

export function sendWhatsApp(message: WhatsAppMessage): Promise<void> {
  return whatsAppProvider.send(message);
}

export function isWhatsAppEnabled(): boolean {
  return !!(process.env.WHATSAPP_API_URL && process.env.WHATSAPP_API_TOKEN);
}
