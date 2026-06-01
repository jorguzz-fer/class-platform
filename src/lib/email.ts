import { Resend } from "resend";

/**
 * Abstração de envio de e-mail.
 *
 * Seleção do provider por ambiente, sem segredos no código:
 * - Se `RESEND_API_KEY` estiver definido → envia de verdade via Resend.
 * - Caso contrário → provider de desenvolvimento, que apenas loga no servidor
 *   (nunca em produção, nunca em respostas HTTP).
 *
 * Plugar outro provider (SES/SMTP) = implementar a interface EmailProvider.
 */

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}

/** Provider de desenvolvimento: loga o e-mail no servidor (nunca em produção). */
const devEmailProvider: EmailProvider = {
  async send(message) {
    if (process.env.NODE_ENV !== "production") {
      console.info(
        `[email:dev] para=${message.to} assunto="${message.subject}"\n${message.text}`,
      );
    }
    // Sem provider configurado em produção: não envia (evita falsa sensação de envio).
  },
};

/** Provider real via Resend. */
function createResendProvider(apiKey: string): EmailProvider {
  const resend = new Resend(apiKey);
  // Remetente verificado no Resend; configurável por env.
  const from = process.env.EMAIL_FROM ?? "ClassOS <no-reply@classos.app>";

  return {
    async send(message) {
      const { error } = await resend.emails.send({
        from,
        to: message.to,
        subject: message.subject,
        text: message.text,
      });
      if (error) {
        // Não vaza detalhes do provider para o usuário; loga para diagnóstico.
        console.error("[email:resend] falha ao enviar:", error.message);
        throw new Error("Falha ao enviar e-mail.");
      }
    },
  };
}

function resolveProvider(): EmailProvider {
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) return createResendProvider(apiKey);
  return devEmailProvider;
}

export const emailProvider: EmailProvider = resolveProvider();

export function sendEmail(message: EmailMessage): Promise<void> {
  return emailProvider.send(message);
}
