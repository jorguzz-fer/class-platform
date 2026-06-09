"use server";

import { revalidatePath } from "next/cache";

import { requireOrg } from "@/lib/tenant";
import { assertPermission } from "@/lib/permissions";
import { getOrgPlan } from "@/services/school.service";
import {
  quizSettingsSchema,
  quizQuestionSchema,
  quizSubmissionSchema,
  quizGradeSchema,
  type QuizQuestionInput,
  type QuizSubmissionInput,
  type QuizGradeInput,
} from "@/lib/validators";
import {
  createQuizForModule,
  updateQuizSettings,
  setQuizPublished,
  deleteQuiz,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
  submitQuizAttempt,
  gradeOpenAnswers,
} from "@/services/quiz.service";

export type ActionResult =
  | { error?: string; fieldErrors?: Record<string, string[]> }
  | null;

/**
 * Provas são liberadas por padrão (default-allow): só bloqueia se o plano
 * existir e desligar explicitamente `hasAssessments`. Assim, orgs em trial
 * (sem plano) seguem com acesso.
 */
async function assessmentsEnabled(organizationId: string) {
  const plan = await getOrgPlan(organizationId);
  return !plan || plan.hasAssessments;
}

function revalidateQuiz(courseId: string, moduleId: string) {
  revalidatePath(`/dashboard/courses/${courseId}/modules`);
  revalidatePath(`/dashboard/courses/${courseId}/modules/${moduleId}/quiz`);
}

// ---- Configurações da prova ----------------------------------------------

export async function createQuizAction(
  courseId: string,
  moduleId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertPermission(ctx.role, "course:edit");
  if (!(await assessmentsEnabled(ctx.organizationId)))
    return { error: "Recurso de provas não disponível no seu plano." };

  const parsed = parseSettings(formData);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const created = await createQuizForModule(ctx.organizationId, moduleId, parsed.data);
  if (!created) return { error: "Módulo não encontrado." };

  revalidateQuiz(courseId, moduleId);
  return null;
}

export async function updateQuizSettingsAction(
  courseId: string,
  moduleId: string,
  quizId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertPermission(ctx.role, "course:edit");

  const parsed = parseSettings(formData);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const ok = await updateQuizSettings(ctx.organizationId, quizId, parsed.data);
  if (!ok) return { error: "Prova não encontrada." };

  revalidateQuiz(courseId, moduleId);
  return null;
}

function parseSettings(formData: FormData) {
  return quizSettingsSchema.safeParse({
    title: formData.get("title"),
    passingScore: formData.get("passingScore"),
    // vazio = ilimitado (undefined)
    maxAttempts: formData.get("maxAttempts") || undefined,
    blocksProgress:
      formData.get("blocksProgress") === "on" ||
      formData.get("blocksProgress") === "true",
  });
}

export async function setQuizPublishedAction(
  courseId: string,
  moduleId: string,
  quizId: string,
  published: boolean,
): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertPermission(ctx.role, "course:edit");
  if (published && !(await assessmentsEnabled(ctx.organizationId)))
    return { error: "Recurso de provas não disponível no seu plano." };

  const result = await setQuizPublished(ctx.organizationId, quizId, published);
  if (!result.ok) return { error: result.error };

  revalidateQuiz(courseId, moduleId);
  return null;
}

export async function deleteQuizAction(
  courseId: string,
  moduleId: string,
  quizId: string,
): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertPermission(ctx.role, "course:edit");

  const ok = await deleteQuiz(ctx.organizationId, quizId);
  if (!ok) return { error: "Prova não encontrada." };

  revalidateQuiz(courseId, moduleId);
  return null;
}

// ---- Questões -------------------------------------------------------------

export async function addQuestionAction(
  courseId: string,
  moduleId: string,
  quizId: string,
  input: QuizQuestionInput,
): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertPermission(ctx.role, "course:edit");

  const parsed = quizQuestionSchema.safeParse(input);
  if (!parsed.success) return { error: firstError(parsed.error) };

  const created = await addQuestion(ctx.organizationId, quizId, parsed.data);
  if (!created) return { error: "Prova não encontrada." };

  revalidateQuiz(courseId, moduleId);
  return null;
}

export async function updateQuestionAction(
  courseId: string,
  moduleId: string,
  questionId: string,
  input: QuizQuestionInput,
): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertPermission(ctx.role, "course:edit");

  const parsed = quizQuestionSchema.safeParse(input);
  if (!parsed.success) return { error: firstError(parsed.error) };

  const ok = await updateQuestion(ctx.organizationId, questionId, parsed.data);
  if (!ok) return { error: "Questão não encontrada." };

  revalidateQuiz(courseId, moduleId);
  return null;
}

export async function deleteQuestionAction(
  courseId: string,
  moduleId: string,
  questionId: string,
): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertPermission(ctx.role, "course:edit");

  const ok = await deleteQuestion(ctx.organizationId, questionId);
  if (!ok) return { error: "Questão não encontrada." };

  revalidateQuiz(courseId, moduleId);
  return null;
}

export async function reorderQuestionsAction(
  courseId: string,
  moduleId: string,
  quizId: string,
  orderedIds: string[],
): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertPermission(ctx.role, "course:edit");

  await reorderQuestions(ctx.organizationId, quizId, orderedIds);
  revalidateQuiz(courseId, moduleId);
  return null;
}

// ---- Aluno: enviar prova --------------------------------------------------

export async function submitQuizAttemptAction(
  quizId: string,
  courseSlug: string,
  submission: QuizSubmissionInput,
): Promise<
  | { ok: false; error: string }
  | { ok: true; attemptId: string; status: string; score: number | null }
> {
  const ctx = await requireOrg();

  const parsed = quizSubmissionSchema.safeParse(submission);
  if (!parsed.success) return { ok: false, error: "Respostas inválidas." };

  const result = await submitQuizAttempt(ctx.userId, quizId, parsed.data);
  if (!result.ok) return result;

  revalidatePath(`/app/courses/${courseSlug}`);
  return result;
}

// ---- Dono: corrigir dissertativa -----------------------------------------

export async function gradeAttemptAction(
  attemptId: string,
  input: QuizGradeInput,
): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertPermission(ctx.role, "course:edit");

  const parsed = quizGradeSchema.safeParse(input);
  if (!parsed.success) return { error: "Notas inválidas." };

  const result = await gradeOpenAnswers(ctx.organizationId, attemptId, parsed.data);
  if (!result.ok) return { error: result.error };

  revalidatePath("/dashboard/assessments");
  return null;
}

function firstError(error: import("zod").ZodError): string {
  const flat = error.flatten();
  const field = Object.values(flat.fieldErrors).flat()[0];
  return field || flat.formErrors[0] || "Verifique os dados da questão.";
}
