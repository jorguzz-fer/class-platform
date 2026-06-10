"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireOrg } from "@/lib/tenant";
import { assertPermission } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { getAIProvider } from "@/lib/ai";
import { aiOutlineSchema } from "@/lib/validators";
import { getOrgPlan } from "@/services/school.service";
import { createCourse } from "@/services/course.service";
import { createModule } from "@/services/module.service";
import { createLesson, getLesson } from "@/services/lesson.service";
import { extractTextFromUpload } from "@/services/document-extract.service";

export type AIResult = { error?: string; fieldErrors?: Record<string, string[]> } | null;

/** Garante que o plano da organização libera recursos de IA (SPEC §8.11). */
async function assertAIPlan(organizationId: string): Promise<string | null> {
  const plan = await getOrgPlan(organizationId);
  if (!plan?.hasAiFeatures) {
    return "Recursos de IA não estão disponíveis no seu plano.";
  }
  return null;
}

/**
 * Gera a estrutura de um curso com IA e a materializa como curso DRAFT
 * (módulos + aulas), pronta para o instrutor revisar e publicar.
 */
export async function generateCourseOutlineAction(
  _prev: AIResult,
  formData: FormData,
): Promise<AIResult> {
  const ctx = await requireOrg();
  assertPermission(ctx.role, "course:create");

  const planError = await assertAIPlan(ctx.organizationId);
  if (planError) return { error: planError };

  const parsed = aiOutlineSchema.safeParse({
    topic: formData.get("topic"),
    level: formData.get("level"),
    audience: formData.get("audience"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  let outline;
  try {
    outline = await getAIProvider().generateCourseOutline({
      topic: parsed.data.topic,
      level: parsed.data.level || undefined,
      audience: parsed.data.audience || undefined,
    });
  } catch {
    return { error: "Não foi possível gerar a estrutura. Tente novamente." };
  }

  // Materializa o curso e o currículo gerados.
  const course = await createCourse(ctx.organizationId, ctx.userId, {
    title: outline.title,
    subtitle: outline.subtitle,
    level: "ALL_LEVELS",
    // Pública por padrão: ao PUBLICAR, já aparece no catálogo. Segue DRAFT até
    // o instrutor publicar, então nada fica visível antes da revisão.
    visibility: "PUBLIC",
  });

  for (const mod of outline.modules) {
    const created = await createModule(ctx.organizationId, course.id, {
      title: mod.title,
      description: mod.description,
    });
    if (!created) continue;
    for (const lesson of mod.lessons) {
      await createLesson(ctx.organizationId, created.id, {
        title: lesson.title,
        description: lesson.description,
        contentType: "VIDEO",
        isPreview: false,
        isRequired: true,
      });
    }
  }

  await audit({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: "ai.generate_course",
    entityType: "Course",
    entityId: course.id,
  });

  revalidatePath("/dashboard/courses");
  redirect(`/dashboard/courses/${course.id}/modules`);
}

/**
 * Sobe um documento (PDF/DOCX/TXT) e deixa a IA organizar TODO o conteúdo em
 * um curso DRAFT (módulos + aulas de texto), para o instrutor revisar.
 */
export async function generateCourseFromDocumentAction(
  _prev: AIResult,
  formData: FormData,
): Promise<AIResult> {
  const ctx = await requireOrg();
  assertPermission(ctx.role, "course:create");

  const planError = await assertAIPlan(ctx.organizationId);
  if (planError) return { error: planError };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Envie um arquivo PDF, DOCX ou TXT." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.toLowerCase().split(".").pop() ?? "";
  const level = (formData.get("level") as string) || undefined;
  const audience = (formData.get("audience") as string) || undefined;
  const provider = getAIProvider();

  let outline;
  try {
    if (ext === "pdf") {
      // PDF (texto OU imagem/slides): o Claude lê nativamente. Limitamos o
      // tamanho por custo/latência — a API aceita bem maiores.
      if (buffer.byteLength > 10 * 1024 * 1024) {
        return { error: "PDF muito grande (máx. 10 MB)." };
      }
      outline = await provider.generateCourseFromPdf({
        pdfBase64: buffer.toString("base64"),
        level,
        audience,
      });
    } else {
      // DOCX/TXT: extrai o texto e organiza.
      const extracted = await extractTextFromUpload(file.name, buffer);
      if (!extracted.ok) return { error: extracted.error };
      outline = await provider.generateCourseFromDocument({
        content: extracted.text,
        level,
        audience,
      });
    }
  } catch {
    return { error: "Não foi possível organizar o documento. Tente novamente." };
  }

  const course = await createCourse(ctx.organizationId, ctx.userId, {
    title: outline.title,
    subtitle: outline.subtitle,
    description: outline.description || undefined,
    level: "ALL_LEVELS",
    // Pública por padrão: ao PUBLICAR, já aparece no catálogo. Segue DRAFT até
    // o instrutor publicar, então nada fica visível antes da revisão.
    visibility: "PUBLIC",
  });

  for (const mod of outline.modules) {
    const created = await createModule(ctx.organizationId, course.id, {
      title: mod.title,
      description: mod.description,
    });
    if (!created) continue;
    for (const lesson of mod.lessons) {
      await createLesson(ctx.organizationId, created.id, {
        title: lesson.title,
        contentType: "TEXT",
        textContent: lesson.content,
        isPreview: false,
        isRequired: true,
      });
    }
  }

  await audit({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: "ai.generate_course_from_document",
    entityType: "Course",
    entityId: course.id,
  });

  revalidatePath("/dashboard/courses");
  redirect(`/dashboard/courses/${course.id}/modules`);
}

// (resumo e quiz abaixo)

/** Gera um resumo de uma aula (texto). */
export async function summarizeLessonAction(
  lessonId: string,
): Promise<{ ok: true; summary: string } | { ok: false; error: string }> {
  const ctx = await requireOrg();
  assertPermission(ctx.role, "course:edit");

  const planError = await assertAIPlan(ctx.organizationId);
  if (planError) return { ok: false, error: planError };

  const lesson = await getLesson(ctx.organizationId, lessonId);
  if (!lesson) return { ok: false, error: "Aula não encontrada." };

  try {
    const summary = await getAIProvider().summarizeLesson({
      title: lesson.title,
      content: lesson.textContent ?? lesson.description ?? lesson.title,
    });
    return { ok: true, summary };
  } catch {
    return { ok: false, error: "Não foi possível gerar o resumo." };
  }
}

/** Gera um quiz a partir de uma aula. */
export async function generateQuizAction(
  lessonId: string,
): Promise<
  | { ok: true; quiz: { question: string; options: string[]; correctIndex: number }[] }
  | { ok: false; error: string }
> {
  const ctx = await requireOrg();
  assertPermission(ctx.role, "course:edit");

  const planError = await assertAIPlan(ctx.organizationId);
  if (planError) return { ok: false, error: planError };

  const lesson = await getLesson(ctx.organizationId, lessonId);
  if (!lesson) return { ok: false, error: "Aula não encontrada." };

  try {
    const quiz = await getAIProvider().generateQuiz({
      title: lesson.title,
      content: lesson.textContent ?? lesson.description ?? lesson.title,
    });
    return { ok: true, quiz: quiz.questions };
  } catch {
    return { ok: false, error: "Não foi possível gerar o quiz." };
  }
}
