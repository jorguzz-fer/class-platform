import { UserRole } from "@prisma/client";

/**
 * Matriz de permissões do SPEC §7.
 * Mantém o controle de acesso centralizado e testável.
 */
export type Permission =
  // Plataforma (SUPER_ADMIN)
  | "platform:manage_organizations"
  | "platform:view_global_metrics"
  | "platform:manage_plans"
  | "platform:view_audit_logs"
  // Organização / escola
  | "org:manage" // configurações, exclusão
  | "org:manage_billing" // plano contratado
  | "org:manage_team" // criar/editar usuários da escola
  | "org:manage_branding"
  | "org:manage_domain"
  | "org:view_reports"
  // Cursos / conteúdo
  | "course:create"
  | "course:edit"
  | "course:delete"
  | "course:edit_own" // instrutor edita os próprios cursos
  // Alunos / matrículas
  | "student:manage"
  | "student:view"
  | "enrollment:manage"
  | "enrollment:view"
  | "progress:view";

const ALL_PERMISSIONS: Permission[] = [
  "platform:manage_organizations",
  "platform:view_global_metrics",
  "platform:manage_plans",
  "platform:view_audit_logs",
  "org:manage",
  "org:manage_billing",
  "org:manage_team",
  "org:manage_branding",
  "org:manage_domain",
  "org:view_reports",
  "course:create",
  "course:edit",
  "course:delete",
  "course:edit_own",
  "student:manage",
  "student:view",
  "enrollment:manage",
  "enrollment:view",
  "progress:view",
];

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: ALL_PERMISSIONS,

  ORG_OWNER: [
    "org:manage",
    "org:manage_billing",
    "org:manage_team",
    "org:manage_branding",
    "org:manage_domain",
    "org:view_reports",
    "course:create",
    "course:edit",
    "course:delete",
    "course:edit_own",
    "student:manage",
    "student:view",
    "enrollment:manage",
    "enrollment:view",
    "progress:view",
  ],

  // ORG_ADMIN: não altera plano, não exclui org, não mexe em billing crítico.
  ORG_ADMIN: [
    "org:manage_team",
    "org:view_reports",
    "course:create",
    "course:edit",
    "course:delete",
    "course:edit_own",
    "student:manage",
    "student:view",
    "enrollment:manage",
    "enrollment:view",
    "progress:view",
  ],

  // INSTRUCTOR: cria/edita os próprios cursos e vê alunos/progresso dos seus cursos.
  INSTRUCTOR: ["course:create", "course:edit_own", "student:view", "progress:view"],

  // SUPPORT: ajuda alunos, sem editar cursos.
  SUPPORT: ["student:view", "enrollment:view", "progress:view"],

  // STUDENT: aluno final — sem permissões administrativas.
  STUDENT: [],
};

export function can(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/** Lança erro se o papel não possuir a permissão. Use em server actions/handlers. */
export function assertPermission(role: UserRole, permission: Permission): void {
  if (!can(role, permission)) {
    throw new Error(`Acesso negado: papel ${role} não possui "${permission}".`);
  }
}

/** Papéis com acesso ao painel administrativo da escola (/dashboard). */
export const STAFF_ROLES: UserRole[] = [
  "ORG_OWNER",
  "ORG_ADMIN",
  "INSTRUCTOR",
  "SUPPORT",
];

export function isStaff(role: UserRole): boolean {
  return STAFF_ROLES.includes(role);
}
