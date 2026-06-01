import { db } from "@/lib/db";
import type { UserRole } from "@prisma/client";

import { isStaff } from "@/lib/permissions";

/**
 * Serviço de Comunidade (Fase 3): feed, posts, comentários e curtidas.
 * Tudo escopado por organizationId. Comentários são polimórficos (post ou aula).
 *
 * Acesso à leitura do feed:
 * - Staff (owner/admin/instrutor/suporte) vê todo o feed da organização.
 * - Aluno vê o feed geral (sem curso) + feeds de cursos em que está matriculado.
 */

/** Ids de cursos em que o usuário tem matrícula ativa/concluída. */
async function enrolledCourseIds(organizationId: string, userId: string) {
  const rows = await db.enrollment.findMany({
    where: { organizationId, studentId: userId, status: { in: ["ACTIVE", "COMPLETED"] } },
    select: { courseId: true },
  });
  return rows.map((r) => r.courseId);
}

export async function listFeed(
  organizationId: string,
  user: { id: string; role: UserRole },
) {
  // Filtro de visibilidade por papel.
  const where = isStaff(user.role)
    ? { organizationId }
    : {
        organizationId,
        OR: [
          { courseId: null },
          { courseId: { in: await enrolledCourseIds(organizationId, user.id) } },
        ],
      };

  return db.post.findMany({
    where,
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    include: {
      author: { select: { id: true, name: true } },
      course: { select: { id: true, title: true } },
      _count: { select: { comments: true, likes: true } },
      likes: { where: { userId: user.id }, select: { id: true } },
    },
    take: 100,
  });
}

/** Cria um post. Se courseId for informado, valida acesso ao curso. */
export type CreatePostResult = { ok: true; postId: string } | { ok: false; error: string };

export async function createPost(
  organizationId: string,
  user: { id: string; role: UserRole },
  input: { content: string; courseId?: string | null },
): Promise<CreatePostResult> {
  if (input.courseId) {
    const course = await db.course.findFirst({
      where: { id: input.courseId, organizationId },
      select: { id: true },
    });
    if (!course) return { ok: false, error: "Curso não encontrado." };
    // Aluno só posta em curso que cursa; staff posta em qualquer curso da org.
    if (!isStaff(user.role)) {
      const enrolled = await db.enrollment.findFirst({
        where: { organizationId, studentId: user.id, courseId: input.courseId, status: { in: ["ACTIVE", "COMPLETED"] } },
        select: { id: true },
      });
      if (!enrolled) return { ok: false, error: "Sem acesso a este curso." };
    }
  }

  const post = await db.post.create({
    data: {
      organizationId,
      authorId: user.id,
      courseId: input.courseId || null,
      content: input.content,
    },
  });
  return { ok: true, postId: post.id };
}

/** Excluir post: o autor ou um staff podem remover (moderação). */
export async function deletePost(
  organizationId: string,
  user: { id: string; role: UserRole },
  postId: string,
) {
  const post = await db.post.findFirst({
    where: { id: postId, organizationId },
    select: { authorId: true },
  });
  if (!post) return false;
  if (post.authorId !== user.id && !isStaff(user.role)) return false;

  await db.post.delete({ where: { id: postId } });
  return true;
}

/** Fixar/desafixar post — apenas staff (moderação). */
export async function setPostPinned(
  organizationId: string,
  user: { role: UserRole },
  postId: string,
  pinned: boolean,
) {
  if (!isStaff(user.role)) return false;
  const result = await db.post.updateMany({
    where: { id: postId, organizationId },
    data: { isPinned: pinned },
  });
  return result.count > 0;
}

/** Curtir/descurtir (toggle). Retorna o novo estado. */
export async function toggleLike(
  organizationId: string,
  userId: string,
  postId: string,
): Promise<{ ok: boolean; liked: boolean }> {
  const post = await db.post.findFirst({
    where: { id: postId, organizationId },
    select: { id: true },
  });
  if (!post) return { ok: false, liked: false };

  const existing = await db.postLike.findUnique({
    where: { postId_userId: { postId, userId } },
    select: { id: true },
  });
  if (existing) {
    await db.postLike.delete({ where: { id: existing.id } });
    return { ok: true, liked: false };
  }
  await db.postLike.create({ data: { postId, userId } });
  return { ok: true, liked: true };
}

// ---- Comentários ----------------------------------------------------------

export function listPostComments(organizationId: string, postId: string) {
  return db.comment.findMany({
    where: { organizationId, postId },
    orderBy: { createdAt: "asc" },
    include: { author: { select: { id: true, name: true } } },
  });
}

export function listLessonComments(organizationId: string, lessonId: string) {
  return db.comment.findMany({
    where: { organizationId, lessonId },
    orderBy: { createdAt: "asc" },
    include: { author: { select: { id: true, name: true } } },
  });
}

export type CommentResult = { ok: true; commentId: string } | { ok: false; error: string };

/** Comenta em um post (valida que o post é da org). */
export async function commentOnPost(
  organizationId: string,
  userId: string,
  postId: string,
  content: string,
): Promise<CommentResult> {
  const post = await db.post.findFirst({
    where: { id: postId, organizationId },
    select: { id: true },
  });
  if (!post) return { ok: false, error: "Post não encontrado." };

  const comment = await db.comment.create({
    data: { organizationId, authorId: userId, postId, content },
  });
  return { ok: true, commentId: comment.id };
}

/** Comenta em uma aula (valida acesso via matrícula no curso da aula). */
export async function commentOnLesson(
  organizationId: string,
  userId: string,
  role: UserRole,
  lessonId: string,
  content: string,
): Promise<CommentResult> {
  const lesson = await db.lesson.findFirst({
    where: { id: lessonId, organizationId },
    select: { id: true, courseId: true },
  });
  if (!lesson) return { ok: false, error: "Aula não encontrada." };

  if (!isStaff(role)) {
    const enrolled = await db.enrollment.findFirst({
      where: { organizationId, studentId: userId, courseId: lesson.courseId, status: { in: ["ACTIVE", "COMPLETED"] } },
      select: { id: true },
    });
    if (!enrolled) return { ok: false, error: "Sem acesso a esta aula." };
  }

  const comment = await db.comment.create({
    data: { organizationId, authorId: userId, lessonId, content },
  });
  return { ok: true, commentId: comment.id };
}

/** Excluir comentário: autor ou staff. */
export async function deleteComment(
  organizationId: string,
  user: { id: string; role: UserRole },
  commentId: string,
) {
  const comment = await db.comment.findFirst({
    where: { id: commentId, organizationId },
    select: { authorId: true },
  });
  if (!comment) return false;
  if (comment.authorId !== user.id && !isStaff(user.role)) return false;

  await db.comment.delete({ where: { id: commentId } });
  return true;
}
