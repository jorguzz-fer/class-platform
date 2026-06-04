"use server";

import { revalidatePath } from "next/cache";

import { requireOrg } from "@/lib/tenant";
import { createPostSchema, commentSchema } from "@/lib/validators";
import {
  createPost,
  deletePost,
  setPostPinned,
  toggleLike,
  commentOnPost,
  commentOnLesson,
  deleteComment,
} from "@/services/community.service";

export type CommunityState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string[]> } | null;

export async function createPostAction(
  _prev: CommunityState,
  formData: FormData,
): Promise<CommunityState> {
  const ctx = await requireOrg();

  const parsed = createPostSchema.safeParse({
    content: formData.get("content"),
    courseId: formData.get("courseId"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const result = await createPost(
    ctx.organizationId,
    { id: ctx.userId, role: ctx.role },
    { content: parsed.data.content, courseId: parsed.data.courseId || null },
  );
  if (!result.ok) return { error: result.error };

  revalidatePath("/app/community");
  return { ok: true };
}

export async function deletePostAction(postId: string): Promise<CommunityState> {
  const ctx = await requireOrg();
  const ok = await deletePost(ctx.organizationId, { id: ctx.userId, role: ctx.role }, postId);
  if (!ok) return { error: "Não foi possível remover." };
  revalidatePath("/app/community");
  return { ok: true };
}

export async function togglePinAction(postId: string, pinned: boolean): Promise<CommunityState> {
  const ctx = await requireOrg();
  const ok = await setPostPinned(ctx.organizationId, { role: ctx.role }, postId, pinned);
  if (!ok) return { error: "Ação não permitida." };
  revalidatePath("/app/community");
  return { ok: true };
}

export async function toggleLikeAction(postId: string): Promise<{ ok: boolean; liked: boolean }> {
  const ctx = await requireOrg();
  const result = await toggleLike(ctx.organizationId, ctx.userId, postId);
  revalidatePath("/app/community");
  return result;
}

export async function commentOnPostAction(
  postId: string,
  _prev: CommunityState,
  formData: FormData,
): Promise<CommunityState> {
  const ctx = await requireOrg();
  const parsed = commentSchema.safeParse({ content: formData.get("content") });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const result = await commentOnPost(ctx.organizationId, ctx.userId, postId, parsed.data.content);
  if (!result.ok) return { error: result.error };

  revalidatePath("/app/community");
  return { ok: true };
}

export async function commentOnLessonAction(
  lessonId: string,
  courseSlug: string,
  _prev: CommunityState,
  formData: FormData,
): Promise<CommunityState> {
  const ctx = await requireOrg();
  const parsed = commentSchema.safeParse({ content: formData.get("content") });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const result = await commentOnLesson(
    ctx.organizationId,
    ctx.userId,
    ctx.role,
    lessonId,
    parsed.data.content,
  );
  if (!result.ok) return { error: result.error };

  revalidatePath(`/app/courses/${courseSlug}/lessons/${lessonId}`);
  return { ok: true };
}

export async function deleteCommentAction(commentId: string): Promise<CommunityState> {
  const ctx = await requireOrg();
  const ok = await deleteComment(ctx.organizationId, { id: ctx.userId, role: ctx.role }, commentId);
  if (!ok) return { error: "Não foi possível remover." };
  revalidatePath("/app/community");
  return { ok: true };
}
