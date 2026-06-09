import bcrypt from "bcryptjs";

import { db } from "@/lib/db";
import type { SelfEnrollInput } from "@/lib/validators";

/**
 * Auto-inscrição pública por link (estilo Netflix: inscrição aberta).
 *
 * O aluno informado cria a própria conta e recebe uma matrícula ACTIVE —
 * acesso imediato ao curso, sem aprovação do dono. O dono é avisado por e-mail
 * que a pessoa começou (e depois, quando concluir).
 *
 * Segurança: só aceita curso PUBLICADO e visível (PUBLIC/UNLISTED) da escola
 * resolvida pelo slug. Se o e-mail já tem conta, não cria nem vincula nada
 * (evita sequestro de conta alheia); orienta a pessoa a entrar e solicitar
 * pela página do curso.
 */
export type SelfEnrollResult =
  | {
      ok: true;
      organizationId: string;
      schoolName: string;
      studentName: string;
      courseTitle: string;
    }
  | { ok: false; code: "EXISTING_EMAIL" | "NOT_FOUND"; error: string };

export async function selfEnroll(
  input: SelfEnrollInput,
): Promise<SelfEnrollResult> {
  const school = await db.school.findFirst({
    where: {
      subdomain: input.schoolSlug,
      organization: { status: { in: ["ACTIVE", "TRIAL"] } },
    },
    select: { name: true, organizationId: true },
  });
  if (!school) {
    return { ok: false, code: "NOT_FOUND", error: "Escola não encontrada." };
  }

  const course = await db.course.findFirst({
    where: {
      organizationId: school.organizationId,
      slug: input.courseSlug,
      status: "PUBLISHED",
      visibility: { in: ["PUBLIC", "UNLISTED"] },
    },
    select: { id: true, title: true },
  });
  if (!course) {
    return { ok: false, code: "NOT_FOUND", error: "Curso não encontrado." };
  }

  const existing = await db.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });
  if (existing) {
    return {
      ok: false,
      code: "EXISTING_EMAIL",
      error:
        "Este e-mail já tem conta. Entre na sua conta e solicite a inscrição pela página do curso.",
    };
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        role: "STUDENT",
        memberships: {
          create: { organizationId: school.organizationId, role: "STUDENT" },
        },
      },
    });
    await tx.enrollment.create({
      data: {
        organizationId: school.organizationId,
        courseId: course.id,
        studentId: user.id,
        // Inscrição aberta: acesso imediato, sem aprovação do dono.
        status: "ACTIVE",
      },
    });
  });

  return {
    ok: true,
    organizationId: school.organizationId,
    schoolName: school.name,
    studentName: input.name,
    courseTitle: course.title,
  };
}
