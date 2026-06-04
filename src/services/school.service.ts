import { db } from "@/lib/db";
import type {
  SchoolBrandingInput,
  SchoolDomainInput,
  InviteTeamMemberInput,
} from "@/lib/validators";

/**
 * Serviço da Escola (SPEC §14.3). Escopado por organizationId — cada org tem
 * exatamente uma School (relação 1:1).
 */

export function getSchool(organizationId: string) {
  return db.school.findUnique({ where: { organizationId } });
}

/** Plano vinculado à organização (via planId). Null se não houver. */
export async function getOrgPlan(organizationId: string) {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { planId: true },
  });
  if (!org?.planId) return null;
  return db.plan.findUnique({ where: { id: org.planId } });
}

/** Lê um limite numérico do plano (ex.: maxAdmins, maxCourses, maxStudents). */
async function getPlanLimit(
  organizationId: string,
  field: "maxAdmins" | "maxCourses" | "maxStudents",
): Promise<number | null> {
  const plan = await getOrgPlan(organizationId);
  return plan?.[field] ?? null;
}

export async function updateBranding(
  organizationId: string,
  input: SchoolBrandingInput,
) {
  const result = await db.school.updateMany({
    where: { organizationId },
    data: {
      name: input.name,
      description: input.description || null,
      logoUrl: input.logoUrl || null,
      faviconUrl: input.faviconUrl || null,
      primaryColor: input.primaryColor || null,
      secondaryColor: input.secondaryColor || null,
      backgroundColor: input.backgroundColor || null,
    },
  });
  return result.count > 0;
}

export type DomainResult = { ok: true } | { ok: false; error: string };

export async function updateDomain(
  organizationId: string,
  input: SchoolDomainInput,
): Promise<DomainResult> {
  const subdomain = input.subdomain || null;
  const customDomain = input.customDomain || null;

  // Unicidade global de subdomínio/domínio (constraints garantem no banco).
  if (subdomain) {
    const taken = await db.school.findFirst({
      where: { subdomain, organizationId: { not: organizationId } },
      select: { id: true },
    });
    if (taken) return { ok: false, error: "Este subdomínio já está em uso." };
  }
  if (customDomain) {
    const taken = await db.school.findFirst({
      where: { customDomain, organizationId: { not: organizationId } },
      select: { id: true },
    });
    if (taken) return { ok: false, error: "Este domínio já está em uso." };
  }

  await db.school.updateMany({
    where: { organizationId },
    data: { subdomain, customDomain },
  });
  return { ok: true };
}

/** Membros da equipe da escola (não-alunos): owner, admin, instrutor, suporte. */
export function listTeam(organizationId: string) {
  return db.organizationMember.findMany({
    where: { organizationId, role: { not: "STUDENT" } },
    orderBy: { createdAt: "asc" },
    include: {
      user: { select: { id: true, name: true, email: true, isActive: true } },
    },
  });
}

export type InviteResult =
  | { ok: true; userId: string }
  | { ok: false; error: string };

/**
 * Adiciona um membro à equipe da escola (admin/instrutor/suporte).
 * Reusa o User existente por e-mail ou cria um novo (sem senha — define via
 * reset). Respeita o limite de admins do plano (maxAdmins), se houver.
 */
export async function inviteTeamMember(
  organizationId: string,
  input: InviteTeamMemberInput,
): Promise<InviteResult> {
  // Limite de admins do plano (SPEC §11.6).
  if (input.role === "ORG_ADMIN") {
    const maxAdmins = await getPlanLimit(organizationId, "maxAdmins");
    if (maxAdmins != null) {
      const currentAdmins = await db.organizationMember.count({
        where: { organizationId, role: { in: ["ORG_OWNER", "ORG_ADMIN"] } },
      });
      if (currentAdmins >= maxAdmins) {
        return { ok: false, error: "Limite de administradores do plano atingido." };
      }
    }
  }

  const existing = await db.user.findUnique({
    where: { email: input.email },
    include: { memberships: { where: { organizationId } } },
  });

  if (existing) {
    if (existing.memberships.length > 0) {
      return { ok: false, error: "Esta pessoa já faz parte da equipe." };
    }
    await db.organizationMember.create({
      data: { organizationId, userId: existing.id, role: input.role },
    });
    return { ok: true, userId: existing.id };
  }

  const user = await db.user.create({
    data: {
      name: input.name,
      email: input.email,
      role: input.role,
      memberships: { create: { organizationId, role: input.role } },
    },
  });
  return { ok: true, userId: user.id };
}

/** Remove um membro da equipe (não pode remover o owner). */
export async function removeTeamMember(
  organizationId: string,
  memberId: string,
) {
  const member = await db.organizationMember.findFirst({
    where: { id: memberId, organizationId },
    select: { id: true, role: true },
  });
  if (!member || member.role === "ORG_OWNER") return false;

  await db.organizationMember.delete({ where: { id: member.id } });
  return true;
}
