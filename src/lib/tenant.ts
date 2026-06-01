import { redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";

import { auth } from "./auth";
import { db } from "./db";
import { isStaff } from "./permissions";

export interface TenantContext {
  userId: string;
  role: UserRole;
  organizationId: string | null;
  email: string;
  name: string;
}

/**
 * Lê o contexto do usuário logado a partir da sessão E revalida contra o banco.
 *
 * O JWT é apenas um ponteiro: papel, organização e status (isActive) são
 * reconfirmados no banco a cada request. Assim, remover a associação, desativar
 * a conta ou rebaixar o papel passam a ter efeito IMEDIATO, sem esperar o token
 * expirar (corrige acesso revogado/estale). Custo: uma query indexada por id.
 *
 * Retorna null se não houver sessão, se o usuário estiver inativo, ou se o
 * vínculo de organização não existir mais.
 */
export async function getTenantContext(): Promise<TenantContext | null> {
  const session = await auth();
  if (!session?.user) return null;

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      role: true,
      memberships: { select: { organizationId: true, role: true } },
    },
  });
  if (!user || !user.isActive) return null;

  // Resolve a organização ativa do token; se o vínculo sumiu, acesso revogado.
  const tokenOrgId = session.user.organizationId;
  let organizationId: string | null = null;
  let role = user.role;

  if (tokenOrgId) {
    const membership = user.memberships.find((m) => m.organizationId === tokenOrgId);
    if (!membership) return null; // associação removida → sem acesso
    organizationId = membership.organizationId;
    role = membership.role; // papel ATUAL (reflete rebaixamento)
  }

  return {
    userId: user.id,
    role,
    organizationId,
    email: user.email,
    name: user.name,
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
    // SUPER_ADMIN não pertence a uma escola: vai para o painel da plataforma.
    if (ctx.role === "SUPER_ADMIN") redirect("/admin");
    redirect("/login");
  }
  return ctx as TenantContext & { organizationId: string };
}

/**
 * Como requireOrg, mas também bloqueia organizações SUSPENSAS/CANCELADAS
 * (SPEC §11.1). Use nos layouts do painel e da área do aluno. Faz uma query a
 * mais (status da org), por isso é separado de requireOrg.
 */
export async function requireActiveOrg(): Promise<
  TenantContext & { organizationId: string }
> {
  const ctx = await requireOrg();
  const org = await db.organization.findUnique({
    where: { id: ctx.organizationId },
    select: { status: true },
  });
  if (!org || org.status === "SUSPENDED" || org.status === "CANCELED") {
    redirect("/suspended");
  }
  return ctx;
}

/**
 * Exige um membro da EQUIPE da escola (owner/admin/instrutor/suporte) com a
 * organização ativa. Use no layout do painel administrativo (/dashboard) para
 * impedir que um STUDENT acesse páginas administrativas. As páginas continuam
 * usando `can(...)` para gates finos por ação.
 */
export async function requireStaff(): Promise<
  TenantContext & { organizationId: string }
> {
  const ctx = await requireActiveOrg();
  if (!isStaff(ctx.role)) {
    // Aluno logado tentando acessar o painel da escola: vai para a área do aluno.
    redirect("/app");
  }
  return ctx;
}

/**
 * Exige um SUPER_ADMIN da plataforma (painel /admin). Redireciona quem não for.
 */
export async function requireSuperAdmin(): Promise<TenantContext> {
  const ctx = await getTenantContext();
  if (!ctx) redirect("/login");
  if (ctx.role !== "SUPER_ADMIN") redirect("/dashboard");
  return ctx;
}
