import { redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";

import { auth } from "./auth";

export interface TenantContext {
  userId: string;
  role: UserRole;
  organizationId: string | null;
  email: string;
  name: string;
}

/**
 * Lê o contexto do usuário logado a partir da sessão.
 * Retorna null se não houver sessão.
 */
export async function getTenantContext(): Promise<TenantContext | null> {
  const session = await auth();
  if (!session?.user) return null;

  return {
    userId: session.user.id,
    role: session.user.role,
    organizationId: session.user.organizationId,
    email: session.user.email ?? "",
    name: session.user.name ?? "",
  };
}

/**
 * Exige um usuário logado vinculado a uma organização.
 * Redireciona para /login se não houver sessão.
 *
 * Use este helper em toda query de dados de tenant: o `organizationId`
 * retornado DEVE ser usado no filtro para garantir isolamento — nunca
 * confie em ids vindos do cliente.
 */
export async function requireOrg(): Promise<TenantContext & { organizationId: string }> {
  const ctx = await getTenantContext();
  if (!ctx) redirect("/login");
  if (!ctx.organizationId) {
    // Usuário sem organização (ex.: SUPER_ADMIN) não acessa o painel da escola.
    redirect("/login");
  }
  return ctx as TenantContext & { organizationId: string };
}
