"use server";

import { revalidatePath } from "next/cache";

import { requireOrg } from "@/lib/tenant";
import { ratingSchema } from "@/lib/validators";
import { rateCourse, rateLesson } from "@/services/rating.service";

export type RatingActionResult = { error?: string } | null;

export async function rateCourseAction(
  courseId: string,
  courseSlug: string,
  stars: number,
): Promise<RatingActionResult> {
  const ctx = await requireOrg();
  const parsed = ratingSchema.safeParse({ stars });
  if (!parsed.success) return { error: "Nota inválida." };

  const result = await rateCourse(
    ctx.organizationId,
    ctx.userId,
    courseId,
    parsed.data.stars,
  );
  if (!result.ok) return { error: result.error };

  revalidatePath(`/app/courses/${courseSlug}`);
  return null;
}

export async function rateLessonAction(
  lessonId: string,
  stars: number,
): Promise<RatingActionResult> {
  const ctx = await requireOrg();
  const parsed = ratingSchema.safeParse({ stars });
  if (!parsed.success) return { error: "Nota inválida." };

  const result = await rateLesson(
    ctx.organizationId,
    ctx.userId,
    lessonId,
    parsed.data.stars,
  );
  if (!result.ok) return { error: result.error };

  return null;
}
