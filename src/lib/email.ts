/**
 * Abstração de envio de e-mail.
 *
 * No MVP não há provedor configurado. Em desenvolvimento, registramos o e-mail
 * no console (sem expor em respostas HTTP). Em produção, plugar um provider real
 * (Resend, SES, SMTP) implementando esta interface — sem alterar os callers.
 *
 * Segurança: nunca logar tokens/links em produção; o log abaixo é gated por
 * NODE_ENV !== "production".
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
    // Em produção sem provider configurado, silenciosamente não envia.
    // (Substituir por provider real antes de ir a produção.)
  },
};

export const emailProvider: EmailProvider = devEmailProvider;

export function sendEmail(message: EmailMessage): Promise<void> {
  return emailProvider.send(message);
}
