import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { sendWhatsApp } from "@/lib/whatsapp";

/**
 * Serviço de notificações (Fase 5). Envia por e-mail e/ou WhatsApp e registra
 * cada envio em NotificationLog (best-effort: falha de envio não quebra o fluxo
 * principal — o status fica como FAILED para reprocessamento futuro).
 *
 * PII (e-mail/telefone) nunca é logada em texto claro fora do destino do canal.
 */

type Channel = "EMAIL" | "WHATSAPP";

export async function notify(params: {
  organizationId: string;
  userId?: string | null;
  template: string;
  subject: string;
  text: string;
  email?: string | null;
  phone?: string | null;
}): Promise<void> {
  const channels: { channel: Channel; destination: string; run: () => Promise<void> }[] = [];

  if (params.email) {
    channels.push({
      channel: "EMAIL",
      destination: params.email,
      run: () => sendEmail({ to: params.email!, subject: params.subject, text: params.text }),
    });
  }
  if (params.phone) {
    channels.push({
      channel: "WHATSAPP",
      destination: params.phone,
      run: () => sendWhatsApp({ to: params.phone!, text: params.text }),
    });
  }

  for (const c of channels) {
    let status: "SENT" | "FAILED" = "SENT";
    let error: string | null = null;
    try {
      await c.run();
    } catch (e) {
      status = "FAILED";
      error = e instanceof Error ? e.message : "erro desconhecido";
    }
    await db.notificationLog.create({
      data: {
        organizationId: params.organizationId,
        userId: params.userId ?? null,
        channel: c.channel,
        template: params.template,
        destination: c.destination,
        status,
        error,
      },
    });
  }
}

/** Notificações de uma organização (visão admin). */
export function listNotifications(organizationId: string, take = 100) {
  return db.notificationLog.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take,
  });
}
