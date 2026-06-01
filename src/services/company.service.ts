import { db } from "@/lib/db";

/**
 * Serviço B2B (Fase 6): empresas clientes, gestores, turmas corporativas e
 * relatórios por equipe. Tudo escopado por organizationId (a escola é dona das
 * empresas que ela atende).
 */

// ---- Empresas -------------------------------------------------------------

export function listCompanies(organizationId: string) {
  return db.company.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { members: true, cohorts: true } } },
  });
}

export function getCompany(organizationId: string, companyId: string) {
  return db.company.findFirst({
    where: { id: companyId, organizationId },
  });
}

export function createCompany(
  organizationId: string,
  input: { name: string; cnpj?: string | null; contactEmail?: string | null },
) {
  return db.company.create({
    data: {
      organizationId,
      name: input.name,
      cnpj: input.cnpj || null,
      contactEmail: input.contactEmail || null,
    },
  });
}

export async function deleteCompany(organizationId: string, companyId: string) {
  const result = await db.company.deleteMany({
    where: { id: companyId, organizationId },
  });
  return result.count > 0;
}

// ---- Gestores -------------------------------------------------------------

async function assertCompanyInOrg(organizationId: string, companyId: string) {
  return db.company.findFirst({
    where: { id: companyId, organizationId },
    select: { id: true },
  });
}

export type AddManagerResult =
  | { ok: true; userId: string }
  | { ok: false; error: string };

/**
 * Adiciona um gestor a uma empresa. Reusa o User por e-mail ou cria um novo.
 * O gestor recebe o papel de organização SUPPORT (acesso de leitura) por padrão,
 * mas seu vínculo de gestão fica em CompanyMember.
 */
export async function addCompanyManager(
  organizationId: string,
  companyId: string,
  input: { name: string; email: string },
): Promise<AddManagerResult> {
  if (!(await assertCompanyInOrg(organizationId, companyId))) {
    return { ok: false, error: "Empresa não encontrada." };
  }

  const existing = await db.user.findUnique({
    where: { email: input.email },
    include: { companyMemberships: { where: { companyId } } },
  });

  if (existing) {
    if (existing.companyMemberships.length > 0) {
      return { ok: false, error: "Esta pessoa já é gestora desta empresa." };
    }
    await db.companyMember.create({
      data: { companyId, userId: existing.id, role: "MANAGER" },
    });
    // Garante vínculo com a organização (papel SUPPORT) se ainda não tiver.
    const orgMember = await db.organizationMember.findFirst({
      where: { organizationId, userId: existing.id },
      select: { id: true },
    });
    if (!orgMember) {
      await db.organizationMember.create({
        data: { organizationId, userId: existing.id, role: "SUPPORT" },
      });
    }
    return { ok: true, userId: existing.id };
  }

  const user = await db.user.create({
    data: {
      name: input.name,
      email: input.email,
      role: "SUPPORT",
      memberships: { create: { organizationId, role: "SUPPORT" } },
      companyMemberships: { create: { companyId, role: "MANAGER" } },
    },
  });
  return { ok: true, userId: user.id };
}

export function listCompanyManagers(organizationId: string, companyId: string) {
  return db.companyMember.findMany({
    where: { companyId, company: { organizationId } },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
}

export async function removeCompanyManager(
  organizationId: string,
  companyId: string,
  memberId: string,
) {
  const member = await db.companyMember.findFirst({
    where: { id: memberId, companyId, company: { organizationId } },
    select: { id: true },
  });
  if (!member) return false;
  await db.companyMember.delete({ where: { id: member.id } });
  return true;
}

// ---- Turmas corporativas (cohorts) ---------------------------------------

export type CreateCohortResult =
  | { ok: true; cohortId: string }
  | { ok: false; error: string };

export async function createCohort(
  organizationId: string,
  input: { companyId: string; courseId: string; name: string },
): Promise<CreateCohortResult> {
  const [company, course] = await Promise.all([
    assertCompanyInOrg(organizationId, input.companyId),
    db.course.findFirst({
      where: { id: input.courseId, organizationId },
      select: { id: true },
    }),
  ]);
  if (!company) return { ok: false, error: "Empresa não encontrada." };
  if (!course) return { ok: false, error: "Curso não encontrado." };

  const cohort = await db.cohort.create({
    data: {
      organizationId,
      companyId: input.companyId,
      courseId: input.courseId,
      name: input.name,
    },
  });
  return { ok: true, cohortId: cohort.id };
}

export function listCohorts(organizationId: string, companyId: string) {
  return db.cohort.findMany({
    where: { organizationId, companyId },
    orderBy: { createdAt: "desc" },
    include: {
      course: { select: { title: true } },
      _count: { select: { members: true } },
    },
  });
}

/**
 * Matricula um aluno numa turma: cria CohortMember + Enrollment no curso da
 * turma (idempotente na matrícula). Valida que a turma pertence à org.
 */
export type EnrollCohortResult =
  | { ok: true }
  | { ok: false; error: string };

export async function addStudentToCohort(
  organizationId: string,
  cohortId: string,
  studentId: string,
): Promise<EnrollCohortResult> {
  const cohort = await db.cohort.findFirst({
    where: { id: cohortId, organizationId },
    select: { id: true, courseId: true },
  });
  if (!cohort) return { ok: false, error: "Turma não encontrada." };

  const member = await db.organizationMember.findFirst({
    where: { organizationId, userId: studentId, role: "STUDENT" },
    select: { id: true },
  });
  if (!member) return { ok: false, error: "Aluno não encontrado nesta escola." };

  await db.$transaction(async (tx) => {
    await tx.cohortMember.upsert({
      where: { cohortId_studentId: { cohortId, studentId } },
      update: {},
      create: { cohortId, studentId },
    });
    // Garante matrícula no curso da turma.
    const existing = await tx.enrollment.findUnique({
      where: { courseId_studentId: { courseId: cohort.courseId, studentId } },
      select: { id: true },
    });
    if (!existing) {
      await tx.enrollment.create({
        data: {
          organizationId,
          courseId: cohort.courseId,
          studentId,
          status: "ACTIVE",
        },
      });
    }
  });
  return { ok: true };
}

// ---- Relatório por equipe -------------------------------------------------

/**
 * Relatório de progresso da turma: para cada aluno, % de aulas obrigatórias
 * concluídas no curso da turma. Escopado por org.
 */
export async function getCohortReport(organizationId: string, cohortId: string) {
  const cohort = await db.cohort.findFirst({
    where: { id: cohortId, organizationId },
    include: {
      course: { select: { id: true, title: true } },
      company: { select: { name: true } },
      members: {
        include: { student: { select: { id: true, name: true, email: true } } },
      },
    },
  });
  if (!cohort) return null;

  const requiredTotal = await db.lesson.count({
    where: { courseId: cohort.course.id, isRequired: true },
  });

  const rows = await Promise.all(
    cohort.members.map(async (m) => {
      const done = await db.lessonProgress.count({
        where: {
          organizationId,
          studentId: m.studentId,
          courseId: cohort.course.id,
          status: "COMPLETED",
          lesson: { isRequired: true },
        },
      });
      const enrollment = await db.enrollment.findUnique({
        where: {
          courseId_studentId: { courseId: cohort.course.id, studentId: m.studentId },
        },
        select: { status: true },
      });
      const percent = requiredTotal > 0 ? Math.round((done / requiredTotal) * 100) : 0;
      return {
        studentId: m.student.id,
        name: m.student.name,
        email: m.student.email,
        percent,
        completed: enrollment?.status === "COMPLETED",
      };
    }),
  );

  const avg =
    rows.length > 0
      ? Math.round(rows.reduce((s, r) => s + r.percent, 0) / rows.length)
      : 0;

  return {
    cohortName: cohort.name,
    companyName: cohort.company.name,
    courseTitle: cohort.course.title,
    requiredTotal,
    averageProgress: avg,
    students: rows,
  };
}
