import { db } from "@/lib/db";
import type { AdminUpdateUserInput } from "@/lib/validators";

/**
 * Serviço do painel da plataforma (SUPER_ADMIN, SPEC §9.2).
 * Não há escopo de tenant aqui — é uma visão global da plataforma, restrita ao
 * SUPER_ADMIN pela autorização do caller.
 */

export async function getGlobalMetrics() {
  const [orgs, activeOrgs, trialOrgs, users, courses, enrollments, certificates] =
    await Promise.all([
      db.organization.count(),
      db.organization.count({ where: { status: "ACTIVE" } }),
      db.organization.count({ where: { status: "TRIAL" } }),
      db.user.count(),
      db.course.count(),
      db.enrollment.count(),
      db.certificate.count(),
    ]);
  return { orgs, activeOrgs, trialOrgs, users, courses, enrollments, certificates };
}

export function listOrganizations() {
  return db.organization.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      subscriptionStatus: true,
      planId: true,
      createdAt: true,
      _count: { select: { members: true, courses: true } },
    },
  });
}

export function listPlans() {
  return db.plan.findMany({
    orderBy: { price: "asc" },
    include: { _count: { select: { subscriptions: true } } },
  });
}

export function listAllUsers(take = 100) {
  return db.user.findMany({
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });
}

export function getUserForAdmin(userId: string) {
  return db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });
}

export type AdminUpdateUserResult = { ok: true } | { ok: false; error: string };

/** Edita um usuário pelo painel da plataforma. Garante e-mail único. */
export async function updateUserAsAdmin(
  userId: string,
  input: AdminUpdateUserInput,
): Promise<AdminUpdateUserResult> {
  const clash = await db.user.findFirst({
    where: { email: input.email, id: { not: userId } },
    select: { id: true },
  });
  if (clash) return { ok: false, error: "Já existe outro usuário com este e-mail." };

  const result = await db.user.updateMany({
    where: { id: userId },
    data: {
      name: input.name,
      email: input.email,
      role: input.role,
      isActive: input.isActive,
    },
  });
  if (result.count === 0) return { ok: false, error: "Usuário não encontrado." };
  return { ok: true };
}

export function listAuditLogs(take = 100) {
  return db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take,
    include: { user: { select: { name: true, email: true } } },
  });
}

const ORG_STATUSES = ["ACTIVE", "TRIAL", "SUSPENDED", "CANCELED"] as const;
export type OrgStatus = (typeof ORG_STATUSES)[number];

export async function setOrganizationStatus(
  organizationId: string,
  status: OrgStatus,
) {
  if (!ORG_STATUSES.includes(status)) return false;
  await db.organization.update({
    where: { id: organizationId },
    data: { status },
  });
  return true;
}

/**
 * Vincula a organização a um plano (define quais recursos ela tem, ex.:
 * hasAiFeatures). Valida que o plano existe antes de aplicar.
 */
export async function setOrganizationPlan(
  organizationId: string,
  planId: string,
) {
  const plan = await db.plan.findUnique({
    where: { id: planId },
    select: { id: true },
  });
  if (!plan) return false;
  await db.organization.update({
    where: { id: organizationId },
    data: { planId },
  });
  return true;
}
