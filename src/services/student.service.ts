import { db } from "@/lib/db";
import type { CreateStudentInput, UpdateStudentInput } from "@/lib/validators";

/**
 * Serviço de Alunos (SPEC §14.7).
 *
 * Um "aluno" é um User (role STUDENT) vinculado à organização via
 * OrganizationMember. Tudo é escopado por organizationId: listagens e buscas
 * partem sempre das memberships da organização.
 */

export async function listStudents(organizationId: string) {
  const members = await db.organizationMember.findMany({
    where: { organizationId, role: "STUDENT" },
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          isActive: true,
          createdAt: true,
          _count: { select: { enrollments: { where: { organizationId } } } },
        },
      },
    },
  });
  return members.map((m) => m.user);
}

/** Busca um aluno garantindo que ele é membro STUDENT desta organização. */
export async function getStudent(organizationId: string, studentId: string) {
  const member = await db.organizationMember.findFirst({
    where: { organizationId, userId: studentId, role: "STUDENT" },
    select: { userId: true },
  });
  if (!member) return null;

  return db.user.findUnique({
    where: { id: studentId },
    select: { id: true, name: true, email: true, isActive: true, createdAt: true },
  });
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
      data: { organizationId, userId: existing.id, role: "STUDENT" },
    });
    return { ok: true, studentId: existing.id };
  }

  const user = await db.user.create({
    data: {
      name: input.name,
      email: input.email,
      role: "STUDENT",
      memberships: { create: { organizationId, role: "STUDENT" } },
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
