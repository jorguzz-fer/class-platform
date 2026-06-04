import { db } from "./db";

/**
 * Registra uma ação no AuditLog para accountability (LGPD).
 * Nunca grava conteúdo sensível (senha/token) no metadata — apenas referências
 * mínimas (ids, tipo de entidade) suficientes para auditoria.
 *
 * Best-effort: falha de auditoria não deve quebrar a operação principal.
 */
export async function audit(params: {
  organizationId: string | null;
  userId: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, string | number | boolean | null>;
}): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        organizationId: params.organizationId,
        userId: params.userId,
        action: params.action,
        entityType: params.entityType ?? null,
        entityId: params.entityId ?? null,
        metadata: params.metadata ?? undefined,
      },
    });
  } catch {
    // Não propaga: auditoria é secundária à ação do usuário.
  }
}
