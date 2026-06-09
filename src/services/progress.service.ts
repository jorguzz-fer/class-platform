import { db } from "@/lib/db";

/**
 * Serviço de Progresso e área do aluno (SPEC §10.4, §14.9).
 *
 * Diferente dos serviços administrativos, aqui o escopo é o **aluno logado**:
 * tudo parte das matrículas (Enrollment) do próprio studentId. Um aluno só
 * acessa cursos em que está matriculado (status ACTIVE/COMPLETED).
 */

const ACCESSIBLE = ["ACTIVE", "COMPLETED"] as const;

/** Cursos em que o aluno está matriculado, com progresso agregado. */
export async function listStudentCourses(studentId: string) {
  const enrollments = await db.enrollment.findMany({
    where: { studentId, status: { in: [...ACCESSIBLE] } },
    orderBy: { enrolledAt: "desc" },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          slug: true,
          subtitle: true,
          thumbnailUrl: true,
        },
      },
    },
  });

  // Progresso por curso = aulas obrigatórias concluídas / total de obrigatórias.
  const results = await Promise.all(
    enrollments.map(async (e) => {
      const [requiredTotal, requiredDone] = await Promise.all([
        db.lesson.count({
          where: { courseId: e.course.id, isRequired: true },
        }),
        db.lessonProgress.count({
          where: {
            studentId,
            courseId: e.course.id,
            status: "COMPLETED",
            lesson: { isRequired: true },
          },
        }),
      ]);
      const percent =
        requiredTotal > 0 ? Math.round((requiredDone / requiredTotal) * 100) : 0;
      return {
        enrollmentId: e.id,
        status: e.status,
        course: e.course,
        requiredTotal,
        requiredDone,
        percent,
      };
    }),
  );

  return results;
}

/** Solicitações de inscrição do aluno ainda aguardando aprovação da escola. */
export function listPendingStudentCourses(studentId: string) {
  return db.enrollment.findMany({
    where: { studentId, status: "PENDING" },
    orderBy: { enrolledAt: "desc" },
    select: {
      id: true,
      course: { select: { title: true, subtitle: true } },
    },
  });
}

/** Verifica se o aluno tem acesso ao curso (matrícula ativa/concluída). */
export async function getStudentEnrollment(studentId: string, courseSlug: string) {
  return db.enrollment.findFirst({
    where: {
      studentId,
      status: { in: [...ACCESSIBLE] },
      course: { slug: courseSlug },
    },
    include: { course: { select: { id: true, title: true, slug: true } } },
  });
}

/** Conteúdo completo do curso para o player: módulos, aulas e progresso do aluno. */
export async function getCoursePlayer(studentId: string, courseId: string) {
  const [modules, progress] = await Promise.all([
    db.module.findMany({
      where: { courseId },
      orderBy: { orderIndex: "asc" },
      include: {
        lessons: {
          orderBy: { orderIndex: "asc" },
          select: {
            id: true,
            title: true,
            contentType: true,
            isRequired: true,
            orderIndex: true,
          },
        },
      },
    }),
    db.lessonProgress.findMany({
      where: { studentId, courseId },
      select: { lessonId: true, status: true },
    }),
  ]);

  const progressByLesson = new Map(progress.map((p) => [p.lessonId, p.status]));
  return { modules, progressByLesson };
}

/** Carrega uma aula garantindo que pertence a um curso em que o aluno tem acesso. */
export async function getAccessibleLesson(studentId: string, lessonId: string) {
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: { course: { select: { id: true, slug: true, title: true } } },
  });
  if (!lesson) return null;

  const enrollment = await db.enrollment.findFirst({
    where: {
      studentId,
      courseId: lesson.courseId,
      status: { in: [...ACCESSIBLE] },
    },
    select: { id: true },
  });
  if (!enrollment) return null;

  const prog = await db.lessonProgress.findUnique({
    where: { studentId_lessonId: { studentId, lessonId } },
    select: { status: true, watchedSeconds: true, progressPercentage: true },
  });

  return { lesson, progress: prog };
}

/**
 * Contexto completo de uma aula para o player do aluno: a aula, seus anexos,
 * o status de progresso e a próxima aula (na ordem do curso) para navegação.
 * Retorna null se o aluno não tiver acesso.
 */
export async function getLessonForPlayer(studentId: string, lessonId: string) {
  const access = await getAccessibleLesson(studentId, lessonId);
  if (!access) return null;

  const { lesson, progress } = access;

  const [attachments, ordered] = await Promise.all([
    db.lessonAttachment.findMany({
      where: { lessonId },
      select: { id: true, fileName: true, fileUrl: true, fileType: true },
    }),
    // Ordem linear das aulas do curso (módulo, depois aula).
    db.lesson.findMany({
      where: { courseId: lesson.courseId },
      orderBy: [{ module: { orderIndex: "asc" } }, { orderIndex: "asc" }],
      select: { id: true },
    }),
  ]);

  const index = ordered.findIndex((l) => l.id === lessonId);
  const nextLessonId =
    index >= 0 && index < ordered.length - 1 ? ordered[index + 1].id : null;
  const prevLessonId = index > 0 ? ordered[index - 1].id : null;

  return {
    lesson,
    attachments,
    completed: progress?.status === "COMPLETED",
    nextLessonId,
    prevLessonId,
    position: { current: index + 1, total: ordered.length },
  };
}

/**
 * Registra/atualiza o progresso de uma aula para o aluno.
 * Valida acesso via matrícula antes de gravar. Retorna o estado da matrícula
 * (para refletir conclusão do curso).
 */
export async function setLessonProgress(
  studentId: string,
  lessonId: string,
  data: { status?: "IN_PROGRESS" | "COMPLETED"; watchedSeconds?: number },
) {
  const access = await getAccessibleLesson(studentId, lessonId);
  if (!access) return { ok: false as const, error: "Aula não acessível." };

  const { lesson } = access;
  const completed = data.status === "COMPLETED";

  await db.lessonProgress.upsert({
    where: { studentId_lessonId: { studentId, lessonId } },
    update: {
      status: data.status ?? "IN_PROGRESS",
      watchedSeconds: data.watchedSeconds,
      progressPercentage: completed ? 100 : undefined,
      completedAt: completed ? new Date() : null,
    },
    create: {
      organizationId: lesson.organizationId,
      studentId,
      courseId: lesson.courseId,
      lessonId,
      status: data.status ?? "IN_PROGRESS",
      watchedSeconds: data.watchedSeconds ?? 0,
      progressPercentage: completed ? 100 : 0,
      completedAt: completed ? new Date() : null,
    },
  });

  // Recalcula conclusão do curso: todas as aulas obrigatórias concluídas?
  const courseCompleted = await recomputeCourseCompletion(
    studentId,
    lesson.courseId,
  );

  return { ok: true as const, courseCompleted };
}

/**
 * Marca a matrícula como COMPLETED quando todas as aulas obrigatórias estão
 * concluídas (SPEC §11.4). Idempotente.
 */
export async function recomputeCourseCompletion(
  studentId: string,
  courseId: string,
): Promise<boolean> {
  const requiredTotal = await db.lesson.count({
    where: { courseId, isRequired: true },
  });
  if (requiredTotal === 0) return false;

  const requiredDone = await db.lessonProgress.count({
    where: {
      studentId,
      courseId,
      status: "COMPLETED",
      lesson: { isRequired: true },
    },
  });

  const isComplete = requiredDone >= requiredTotal;

  await db.enrollment.updateMany({
    where: { studentId, courseId, status: { in: ["ACTIVE", "COMPLETED"] } },
    data: {
      status: isComplete ? "COMPLETED" : "ACTIVE",
      completedAt: isComplete ? new Date() : null,
    },
  });

  return isComplete;
}
