import { db } from "@/lib/db";
import type { CreateStudentInput, UpdateStudentInput } from "@/lib/validators";

/**
 * Serviço de Alunos (SPEC §14.7).
 *
 * Um "aluno" é um User (role STUDENT) vinculado à organização via
 * OrganizationMember. Tudo é escopado por organizationId: listagens e buscas
 * partem sempre das memberships da organização.
 */

export async function listStudents(
  organizationId: string,
  filters?: { q?: string; status?: string; operation?: string },
) {
  const q = filters?.q?.trim();
  const active =
    filters?.status === "active"
      ? true
      : filters?.status === "inactive"
        ? false
        : undefined;
  const members = await db.organizationMember.findMany({
    where: {
      organizationId,
      role: "STUDENT",
      ...(filters?.operation ? { operation: filters.operation } : {}),
      user: {
        ...(active !== undefined ? { isActive: active } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" as const } },
                { email: { contains: q, mode: "insensitive" as const } },
              ],
            }
          : {}),
      },
    },
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          cpf: true,
          isActive: true,
          createdAt: true,
          _count: { select: { enrollments: { where: { organizationId } } } },
        },
      },
    },
  });
  return members.map((m) => ({ ...m.user, operation: m.operation }));
}

/** Busca um aluno garantindo que ele é membro STUDENT desta organização. */
export async function getStudent(organizationId: string, studentId: string) {
  const member = await db.organizationMember.findFirst({
    where: { organizationId, userId: studentId, role: "STUDENT" },
    select: { userId: true, operation: true },
  });
  if (!member) return null;

  const user = await db.user.findUnique({
    where: { id: studentId },
    select: { id: true, name: true, email: true, isActive: true, createdAt: true },
  });
  return user ? { ...user, operation: member.operation } : null;
}

export type CreateStudentResult =
  | { ok: true; studentId: string }
  | { ok: false; error: string };

/**
 * Cadastra um aluno na organização.
 * - Se já existe um User com o e-mail, apenas garante a membership STUDENT.
 * - Senão, cria o User (sem senha — define depois via reset) + membership.
 */
export async function createStudent(
  organizationId: string,
  input: CreateStudentInput,
): Promise<CreateStudentResult> {
  const existing = await db.user.findUnique({
    where: { email: input.email },
    include: { memberships: { where: { organizationId } } },
  });

  if (existing) {
    if (existing.memberships.length > 0) {
      return { ok: false, error: "Este aluno já está cadastrado na sua escola." };
    }
    await db.organizationMember.create({
      data: {
        organizationId,
        userId: existing.id,
        role: "STUDENT",
        operation: input.operation || null,
      },
    });
    return { ok: true, studentId: existing.id };
  }

  const user = await db.user.create({
    data: {
      name: input.name,
      email: input.email,
      cpf: input.cpf,
      role: "STUDENT",
      memberships: {
        create: { organizationId, role: "STUDENT", operation: input.operation || null },
      },
    },
  });
  return { ok: true, studentId: user.id };
}

export async function updateStudent(
  organizationId: string,
  studentId: string,
  input: UpdateStudentInput,
) {
  const member = await db.organizationMember.findFirst({
    where: { organizationId, userId: studentId, role: "STUDENT" },
    select: { id: true },
  });
  if (!member) return false;

  await db.user.update({
    where: { id: studentId },
    data: { name: input.name, isActive: input.isActive },
  });
  return true;
}

/** Ativa/inativa um aluno (escopo: membro STUDENT desta org). */
export async function setStudentActive(
  organizationId: string,
  studentId: string,
  isActive: boolean,
): Promise<boolean> {
  const member = await db.organizationMember.findFirst({
    where: { organizationId, userId: studentId, role: "STUDENT" },
    select: { id: true },
  });
  if (!member) return false;

  await db.user.update({ where: { id: studentId }, data: { isActive } });
  return true;
}

/**
 * Remove o aluno da organização (remove a membership e as matrículas desta org).
 * Não deleta o User global — ele pode pertencer a outras escolas.
 */
export async function removeStudent(organizationId: string, studentId: string) {
  const member = await db.organizationMember.findFirst({
    where: { organizationId, userId: studentId, role: "STUDENT" },
    select: { id: true },
  });
  if (!member) return false;

  await db.$transaction([
    db.enrollment.deleteMany({ where: { organizationId, studentId } }),
    db.organizationMember.delete({ where: { id: member.id } }),
  ]);
  return true;
}

// ---- Operações (categorias de alunos por escola) --------------------------

/** Operações configuradas na escola. Lista vazia = campo oculto. */
export async function getStudentOperations(organizationId: string): Promise<string[]> {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { studentOperations: true },
  });
  return org?.studentOperations ?? [];
}

/** Substitui a lista de operações da escola. */
export async function setStudentOperations(organizationId: string, operations: string[]) {
  await db.organization.update({
    where: { id: organizationId },
    data: { studentOperations: operations },
  });
}

/**
 * Valida a operação informada contra a lista da escola. Vazio = sem operação.
 * Recusa valores fora da lista (o dropdown só oferece os itens válidos, então
 * um valor estranho indica formulário adulterado ou lista alterada no meio).
 */
export async function resolveStudentOperation(
  organizationId: string,
  raw: string | null | undefined,
): Promise<{ ok: true; value: string | null } | { ok: false }> {
  const value = raw?.trim();
  if (!value) return { ok: true, value: null };
  const list = await getStudentOperations(organizationId);
  return list.includes(value) ? { ok: true, value } : { ok: false };
}

/** Define (ou limpa) a operação de um aluno desta escola. */
export async function setStudentOperation(
  organizationId: string,
  studentId: string,
  operation: string | null,
): Promise<boolean> {
  const result = await db.organizationMember.updateMany({
    where: { organizationId, userId: studentId, role: "STUDENT" },
    data: { operation },
  });
  return result.count > 0;
}
