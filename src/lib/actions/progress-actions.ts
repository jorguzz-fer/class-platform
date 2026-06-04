"use server";

import { revalidatePath } from "next/cache";

import { requireOrg } from "@/lib/tenant";
import { setLessonProgress } from "@/services/progress.service";

export type ProgressResult =
  | { ok: true; courseCompleted: boolean }
  | { ok: false; error: string };

/**
 * Marca uma aula como concluída para o aluno logado.
 * O escopo é o próprio usuário da sessão (não confiar em studentId do cliente).
 */
export async function completeLessonAction(
  lessonId: string,
  courseSlug: string,
): Promise<ProgressResult> {
  const ctx = await requireOrg();
  const result = await setLessonProgress(ctx.userId, lessonId, {
    status: "COMPLETED",
  });
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath(`/app/courses/${courseSlug}`);
  revalidatePath(`/app/courses/${courseSlug}/lessons/${lessonId}`);
  revalidatePath("/app");
  return { ok: true, courseCompleted: result.courseCompleted };
}

/** Registra início/visualização de uma aula (status IN_PROGRESS). */
export async function startLessonAction(lessonId: string): Promise<ProgressResult> {
  const ctx = await requireOrg();
  const result = await setLessonProgress(ctx.userId, lessonId, {
    status: "IN_PROGRESS",
  });
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, courseCompleted: result.courseCompleted };
}
