import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { slugify } from "@/lib/slug";
import { getVideoProvider } from "@/lib/video/registry";
import type { ApiCourseImportInput, ApiLessonInput } from "@/lib/validators";

/**
 * Import bulk de curso via REST API (integração Aulai).
 *
 * Cria OU atualiza um curso inteiro (com módulos e aulas) num único POST,
 * de forma idempotente: a chave é `(organizationId, sourceRef)`. Republicar o
 * mesmo `sourceRef` atualiza o curso existente em vez de duplicar.
 *
 * Reconciliação que preserva dados: módulos e aulas que trazem `sourceRef` são
 * casados com os existentes e atualizados NO LUGAR — assim o LessonProgress dos
 * alunos (que tem onDelete: Cascade a partir de Lesson) sobrevive ao
 * republish. Só nós realmente removidos do payload são apagados.
 *
 * Tudo escopado por organizationId e executado em transação (atômico: ou o
 * curso inteiro entra, ou nada).
 */

export interface UpsertCourseTreeResult {
  id: string;
  created: boolean;
  published: boolean;
}

/** Normaliza a fonte de vídeo da aula via o registry (igual à UI). */
function normalizeVideo(lesson: ApiLessonInput) {
  const provider = getVideoProvider(lesson.videoProvider || null);
  const hasSource = !!(provider && lesson.videoSource);
  const parsed = hasSource
    ? provider!.parse(lesson.videoSource!)
    : { videoId: null, videoUrl: null };
  return {
    videoProvider: hasSource ? provider!.id : null,
    videoId: hasSource ? parsed.videoId : null,
    videoUrl: hasSource ? parsed.videoUrl : null,
  };
}

/** Campos de Lesson derivados do payload (sem orderIndex/ids). */
function lessonData(lesson: ApiLessonInput) {
  const video = normalizeVideo(lesson);
  return {
    title: lesson.title,
    description: lesson.description || null,
    contentType: lesson.contentType,
    textContent: lesson.textContent || null,
    durationMinutes: lesson.durationMinutes ?? null,
    isPreview: lesson.isPreview,
    isRequired: lesson.isRequired,
    ...video,
  };
}

/** Gera um slug único na org, ignorando o próprio curso (em atualização). */
async function uniqueCourseSlug(
  tx: Prisma.TransactionClient,
  organizationId: string,
  title: string,
  selfId: string | null,
): Promise<string> {
  const base = slugify(title) || "curso";
  let slug = base;
  let suffix = 2;
  while (true) {
    const clash = await tx.course.findFirst({
      where: { organizationId, slug, NOT: selfId ? { id: selfId } : undefined },
      select: { id: true },
    });
    if (!clash) return slug;
    slug = `${base}-${suffix++}`;
  }
}

export async function upsertCourseTree(
  organizationId: string,
  input: ApiCourseImportInput,
): Promise<UpsertCourseTreeResult> {
  // Publica só se houver conteúdo mínimo (SPEC §11.2): ≥1 módulo e ≥1 aula.
  const hasContent = input.modules.some((m) => m.lessons.length > 0);
  const willPublish = input.publish && hasContent;

  return db.$transaction(
    async (tx) => {
      const existing = await tx.course.findFirst({
        where: { organizationId, sourceRef: input.sourceRef },
        select: { id: true, publishedAt: true },
      });

      const baseData = {
        title: input.title,
        subtitle: input.subtitle || null,
        description: input.description || null,
        level: input.level,
        visibility: input.visibility,
        category: input.category || null,
        price: input.price != null ? new Prisma.Decimal(input.price) : null,
        status: willPublish ? ("PUBLISHED" as const) : ("DRAFT" as const),
      };

      let courseId: string;
      const created = !existing;

      if (existing) {
        courseId = existing.id;
        await tx.course.update({
          where: { id: courseId },
          data: {
            ...baseData,
            // Preserva o publishedAt original; só carimba na 1ª publicação.
            publishedAt: willPublish
              ? existing.publishedAt ?? new Date()
              : null,
          },
        });
      } else {
        const slug = await uniqueCourseSlug(tx, organizationId, input.title, null);
        const course = await tx.course.create({
          data: {
            organizationId,
            sourceRef: input.sourceRef,
            slug,
            ...baseData,
            publishedAt: willPublish ? new Date() : null,
          },
          select: { id: true },
        });
        courseId = course.id;
      }

      await syncModules(tx, organizationId, courseId, input.modules);

      return { id: courseId, created, published: willPublish };
    },
    { timeout: 30_000, maxWait: 10_000 },
  );
}

async function syncModules(
  tx: Prisma.TransactionClient,
  organizationId: string,
  courseId: string,
  modules: ApiCourseImportInput["modules"],
) {
  const existing = await tx.module.findMany({
    where: { organizationId, courseId },
    select: { id: true, sourceRef: true },
  });
  const bySourceRef = new Map(
    existing.filter((m) => m.sourceRef).map((m) => [m.sourceRef as string, m.id]),
  );
  const keptIds = new Set<string>();

  for (const [index, mod] of modules.entries()) {
    const matchId = mod.sourceRef ? bySourceRef.get(mod.sourceRef) : undefined;
    let moduleId: string;

    if (matchId) {
      moduleId = matchId;
      await tx.module.update({
        where: { id: moduleId },
        data: {
          title: mod.title,
          description: mod.description || null,
          orderIndex: index,
        },
      });
    } else {
      const createdModule = await tx.module.create({
        data: {
          organizationId,
          courseId,
          sourceRef: mod.sourceRef ?? null,
          title: mod.title,
          description: mod.description || null,
          orderIndex: index,
        },
        select: { id: true },
      });
      moduleId = createdModule.id;
    }
    keptIds.add(moduleId);

    await syncLessons(tx, organizationId, courseId, moduleId, mod.lessons);
  }

  // Remove módulos que sumiram do payload (cascade apaga suas aulas).
  const orphans = existing.filter((m) => !keptIds.has(m.id)).map((m) => m.id);
  if (orphans.length) {
    await tx.module.deleteMany({ where: { id: { in: orphans } } });
  }
}

async function syncLessons(
  tx: Prisma.TransactionClient,
  organizationId: string,
  courseId: string,
  moduleId: string,
  lessons: ApiLessonInput[],
) {
  const existing = await tx.lesson.findMany({
    where: { organizationId, moduleId },
    select: { id: true, sourceRef: true },
  });
  const bySourceRef = new Map(
    existing.filter((l) => l.sourceRef).map((l) => [l.sourceRef as string, l.id]),
  );
  const keptIds = new Set<string>();

  for (const [index, lesson] of lessons.entries()) {
    const matchId = lesson.sourceRef ? bySourceRef.get(lesson.sourceRef) : undefined;

    if (matchId) {
      await tx.lesson.update({
        where: { id: matchId },
        data: { ...lessonData(lesson), orderIndex: index },
      });
      keptIds.add(matchId);
    } else {
      const createdLesson = await tx.lesson.create({
        data: {
          organizationId,
          courseId,
          moduleId,
          sourceRef: lesson.sourceRef ?? null,
          ...lessonData(lesson),
          orderIndex: index,
        },
        select: { id: true },
      });
      keptIds.add(createdLesson.id);
    }
  }

  // Aulas removidas do payload são apagadas (perde-se o progresso só delas).
  const orphans = existing.filter((l) => !keptIds.has(l.id)).map((l) => l.id);
  if (orphans.length) {
    await tx.lesson.deleteMany({ where: { id: { in: orphans } } });
  }
}
