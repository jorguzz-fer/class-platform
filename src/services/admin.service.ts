import { db } from "@/lib/db";

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
