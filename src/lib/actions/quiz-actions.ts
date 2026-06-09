"use server";

import { revalidatePath } from "next/cache";

import { requireOrg } from "@/lib/tenant";
import { assertPermission } from "@/lib/permissions";
import { getOrgPlan } from "@/services/school.service";
import { getAIProvider } from "@/lib/ai";
import { extractTextFromUpload } from "@/services/document-extract.service";
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
  addQuestionsBulk,
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

// ---- Geração por IA (Fase B) ---------------------------------------------

/**
 * Gera questões a partir de texto colado e as insere como rascunho na prova.
 * A própria lista de questões serve de revisão — o dono ajusta/remove depois.
 * Requer o recurso de IA habilitado no plano (hasAiFeatures).
 */
export async function generateQuestionsAction(
  courseId: string,
  moduleId: string,
  quizId: string,
  text: string,
): Promise<ActionResult & { count?: number }> {
  const ctx = await requireOrg();
  assertPermission(ctx.role, "course:edit");

  const plan = await getOrgPlan(ctx.organizationId);
  if (!plan?.hasAiFeatures)
    return { error: "Recurso de IA não disponível no seu plano." };

  const clean = text.trim();
  if (clean.length < 20)
    return { error: "Cole um texto maior (mín. 20 caracteres)." };
  if (clean.length > 50000)
    return { error: "Texto muito longo (máx. 50.000 caracteres)." };

  return generateAndInsert(ctx.organizationId, courseId, moduleId, quizId, clean);
}

/**
 * Gera questões a partir de um ARQUIVO enviado (.docx/.pdf/.txt): extrai o
 * texto no servidor e reaproveita a mesma pipeline de geração (Fase C).
 */
export async function generateFromFileAction(
  courseId: string,
  moduleId: string,
  quizId: string,
  formData: FormData,
): Promise<ActionResult & { count?: number }> {
  const ctx = await requireOrg();
  assertPermission(ctx.role, "course:edit");

  const plan = await getOrgPlan(ctx.organizationId);
  if (!plan?.hasAiFeatures)
    return { error: "Recurso de IA não disponível no seu plano." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0)
    return { error: "Selecione um arquivo." };

  const buffer = Buffer.from(await file.arrayBuffer());
  const extracted = await extractTextFromUpload(file.name, buffer);
  if (!extracted.ok) return { error: extracted.error };

  return generateAndInsert(ctx.organizationId, courseId, moduleId, quizId, extracted.text);
}

/**
 * Núcleo compartilhado (texto colado / arquivo): chama a IA, valida cada
 * questão pelo schema (descarta inválidas) e insere em lote como rascunho.
 */
async function generateAndInsert(
  organizationId: string,
  courseId: string,
  moduleId: string,
  quizId: string,
  text: string,
): Promise<ActionResult & { count?: number }> {
  let generated;
  try {
    generated = await getAIProvider().generateQuestionsFromText({ text });
  } catch {
    return { error: "Falha ao gerar as questões. Tente novamente." };
  }

  const valid: QuizQuestionInput[] = [];
  for (const q of generated.questions) {
    const parsed = quizQuestionSchema.safeParse({
      type: q.type,
      statement: q.statement,
      points: 1,
      options: q.options,
    });
    if (parsed.success) valid.push(parsed.data);
  }
  if (valid.length === 0)
    return { error: "Não foi possível extrair questões válidas." };

  const created = await addQuestionsBulk(organizationId, quizId, valid);
  if (created == null) return { error: "Prova não encontrada." };

  revalidateQuiz(courseId, moduleId);
  return { count: created };
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
