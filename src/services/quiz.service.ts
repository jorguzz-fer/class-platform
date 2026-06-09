import { db } from "@/lib/db";
import type {
  QuizSettingsInput,
  QuizQuestionInput,
  QuizSubmissionInput,
  QuizGradeInput,
} from "@/lib/validators";

/**
 * Serviço de Provas de módulo (Fase A).
 *
 * Uma prova (Quiz) pertence a um módulo (1:1). Questões objetivas
 * (SINGLE_CHOICE / TRUE_FALSE / MULTI_SELECT) são corrigidas automaticamente;
 * a dissertativa (OPEN) é corrigida pelo dono — enquanto houver dissertativa
 * sem nota, a tentativa fica PENDING_GRADING.
 *
 * Trava de progressão: uma prova publicada, com ≥1 questão e blocksProgress,
 * só libera o módulo seguinte quando o aluno tem uma tentativa APROVADA.
 *
 * Multi-tenant: tudo escopado por organizationId. studentId é coluna simples
 * (sem FK), como em CourseRating.
 */

const ACCESSIBLE = ["ACTIVE", "COMPLETED"] as const;

async function isEnrolled(studentId: string, courseId: string) {
  const e = await db.enrollment.findFirst({
    where: { studentId, courseId, status: { in: [...ACCESSIBLE] } },
    select: { id: true },
  });
  return !!e;
}

// ---------------------------------------------------------------------------
// Dono: gestão da prova e questões
// ---------------------------------------------------------------------------

async function getModuleInOrg(organizationId: string, moduleId: string) {
  return db.module.findFirst({
    where: { id: moduleId, organizationId },
    select: { id: true, courseId: true, title: true },
  });
}

/** Prova de um módulo com questões e opções (para o editor do dono). */
export function getQuizByModule(organizationId: string, moduleId: string) {
  return db.quiz.findFirst({
    where: { organizationId, moduleId },
    include: {
      questions: {
        orderBy: { orderIndex: "asc" },
        include: { options: { orderBy: { orderIndex: "asc" } } },
      },
    },
  });
}

/** Cria a prova do módulo (1:1). Se já existir, retorna a existente. */
export async function createQuizForModule(
  organizationId: string,
  moduleId: string,
  settings: QuizSettingsInput,
) {
  const mod = await getModuleInOrg(organizationId, moduleId);
  if (!mod) return null;

  const existing = await db.quiz.findUnique({ where: { moduleId } });
  if (existing) return existing;

  return db.quiz.create({
    data: {
      organizationId,
      courseId: mod.courseId,
      moduleId,
      title: settings.title,
      passingScore: settings.passingScore,
      maxAttempts: settings.maxAttempts ?? null,
      blocksProgress: settings.blocksProgress,
    },
  });
}

export async function updateQuizSettings(
  organizationId: string,
  quizId: string,
  settings: QuizSettingsInput,
) {
  const result = await db.quiz.updateMany({
    where: { id: quizId, organizationId },
    data: {
      title: settings.title,
      passingScore: settings.passingScore,
      maxAttempts: settings.maxAttempts ?? null,
      blocksProgress: settings.blocksProgress,
    },
  });
  return result.count > 0;
}

/**
 * Publica/despublica a prova. Para publicar exige ≥1 questão (não faz sentido
 * travar o aluno numa prova vazia).
 */
export async function setQuizPublished(
  organizationId: string,
  quizId: string,
  published: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const quiz = await db.quiz.findFirst({
    where: { id: quizId, organizationId },
    select: { id: true, _count: { select: { questions: true } } },
  });
  if (!quiz) return { ok: false, error: "Prova não encontrada." };
  if (published && quiz._count.questions === 0)
    return { ok: false, error: "Adicione ao menos uma questão antes de publicar." };

  await db.quiz.update({ where: { id: quizId }, data: { isPublished: published } });
  return { ok: true };
}

export async function deleteQuiz(organizationId: string, quizId: string) {
  const result = await db.quiz.deleteMany({ where: { id: quizId, organizationId } });
  return result.count > 0;
}

/** Garante que a prova pertence à organização; retorna courseId. */
async function getQuizInOrg(organizationId: string, quizId: string) {
  return db.quiz.findFirst({
    where: { id: quizId, organizationId },
    select: { id: true, courseId: true, moduleId: true },
  });
}

export async function addQuestion(
  organizationId: string,
  quizId: string,
  input: QuizQuestionInput,
) {
  const quiz = await getQuizInOrg(organizationId, quizId);
  if (!quiz) return null;

  const count = await db.quizQuestion.count({ where: { quizId } });

  return db.quizQuestion.create({
    data: {
      organizationId,
      quizId,
      type: input.type,
      statement: input.statement,
      points: input.points,
      orderIndex: count,
      options:
        input.type === "OPEN"
          ? undefined
          : {
              create: input.options.map((o, i) => ({
                text: o.text,
                isCorrect: o.isCorrect,
                orderIndex: i,
              })),
            },
    },
  });
}

export async function updateQuestion(
  organizationId: string,
  questionId: string,
  input: QuizQuestionInput,
) {
  const question = await db.quizQuestion.findFirst({
    where: { id: questionId, organizationId },
    select: { id: true },
  });
  if (!question) return null;

  // Substitui as opções (não têm referência externa: QuizAnswer guarda os ids
  // como texto e tentativas passadas permanecem como registro histórico).
  await db.$transaction([
    db.quizOption.deleteMany({ where: { questionId } }),
    db.quizQuestion.update({
      where: { id: questionId },
      data: {
        type: input.type,
        statement: input.statement,
        points: input.points,
        options:
          input.type === "OPEN"
            ? undefined
            : {
                create: input.options.map((o, i) => ({
                  text: o.text,
                  isCorrect: o.isCorrect,
                  orderIndex: i,
                })),
              },
      },
    }),
  ]);
  return true;
}

/**
 * Insere várias questões de uma vez (ex.: geradas por IA a partir de texto).
 * Cada item já deve estar validado pelo schema. Retorna quantas foram criadas.
 */
export async function addQuestionsBulk(
  organizationId: string,
  quizId: string,
  inputs: QuizQuestionInput[],
): Promise<number | null> {
  const quiz = await getQuizInOrg(organizationId, quizId);
  if (!quiz) return null;

  let orderIndex = await db.quizQuestion.count({ where: { quizId } });
  let created = 0;
  for (const input of inputs) {
    await db.quizQuestion.create({
      data: {
        organizationId,
        quizId,
        type: input.type,
        statement: input.statement,
        points: input.points,
        orderIndex: orderIndex++,
        options:
          input.type === "OPEN"
            ? undefined
            : {
                create: input.options.map((o, i) => ({
                  text: o.text,
                  isCorrect: o.isCorrect,
                  orderIndex: i,
                })),
              },
      },
    });
    created++;
  }
  return created;
}

export async function deleteQuestion(organizationId: string, questionId: string) {
  const result = await db.quizQuestion.deleteMany({
    where: { id: questionId, organizationId },
  });
  return result.count > 0;
}

export async function reorderQuestions(
  organizationId: string,
  quizId: string,
  orderedIds: string[],
) {
  const owned = await db.quizQuestion.findMany({
    where: { organizationId, quizId },
    select: { id: true },
  });
  const ownedIds = new Set(owned.map((q) => q.id));
  const valid = orderedIds.filter((id) => ownedIds.has(id));

  await db.$transaction(
    valid.map((id, index) =>
      db.quizQuestion.update({ where: { id }, data: { orderIndex: index } }),
    ),
  );
  return true;
}

// ---------------------------------------------------------------------------
// Trava de progressão
// ---------------------------------------------------------------------------

/**
 * Ids dos módulos BLOQUEADOS para o aluno: a partir do primeiro módulo com prova
 * efetiva (publicada, com questões, que trava) ainda não aprovada, todos os
 * módulos seguintes ficam bloqueados. A navegação livre é preservada nos
 * módulos liberados.
 */
export async function getLockedModuleIds(
  studentId: string,
  courseId: string,
): Promise<Set<string>> {
  const modules = await db.module.findMany({
    where: { courseId },
    orderBy: { orderIndex: "asc" },
    select: {
      id: true,
      quiz: {
        select: {
          id: true,
          isPublished: true,
          blocksProgress: true,
          _count: { select: { questions: true } },
        },
      },
    },
  });
  if (modules.length === 0) return new Set();

  const quizIds = modules
    .map((m) => m.quiz?.id)
    .filter((id): id is string => Boolean(id));
  const passed = quizIds.length
    ? await db.quizAttempt.findMany({
        where: { studentId, quizId: { in: quizIds }, status: "PASSED" },
        select: { quizId: true },
      })
    : [];
  const passedSet = new Set(passed.map((p) => p.quizId));

  const locked = new Set<string>();
  let lock = false;
  for (const m of modules) {
    if (lock) {
      locked.add(m.id);
      continue;
    }
    const eff =
      !!m.quiz && m.quiz.isPublished && m.quiz._count.questions > 0 && m.quiz.blocksProgress;
    if (eff && !passedSet.has(m.quiz!.id)) lock = true; // bloqueia os seguintes
  }
  return locked;
}

export type ModuleQuizState = {
  id: string;
  title: string;
  passingScore: number;
  blocksProgress: boolean;
  questionCount: number;
  requiredLessonsDone: boolean;
  passed: boolean;
  pendingGrading: boolean;
  bestScore: number | null;
  lastStatus: "PENDING_GRADING" | "PASSED" | "FAILED" | null;
  attemptsUsed: number;
  maxAttempts: number | null;
  attemptsLeft: number | null; // null = ilimitado
  canTake: boolean;
};

export type StudentModuleView = {
  id: string;
  title: string;
  locked: boolean;
  lessons: {
    id: string;
    title: string;
    isRequired: boolean;
    completed: boolean;
  }[];
  quiz: ModuleQuizState | null;
};

/**
 * Estrutura completa do curso para o aluno: módulos com aulas (+ concluídas),
 * estado de trava e estado da prova de cada módulo. Usada na página do curso.
 */
export async function getStudentCourseOutline(
  studentId: string,
  courseId: string,
): Promise<StudentModuleView[]> {
  const [modules, progress, locked] = await Promise.all([
    db.module.findMany({
      where: { courseId },
      orderBy: { orderIndex: "asc" },
      select: {
        id: true,
        title: true,
        lessons: {
          orderBy: { orderIndex: "asc" },
          select: { id: true, title: true, isRequired: true },
        },
        quiz: {
          select: {
            id: true,
            title: true,
            passingScore: true,
            blocksProgress: true,
            maxAttempts: true,
            isPublished: true,
            _count: { select: { questions: true } },
          },
        },
      },
    }),
    db.lessonProgress.findMany({
      where: { studentId, courseId, status: "COMPLETED" },
      select: { lessonId: true },
    }),
    getLockedModuleIds(studentId, courseId),
  ]);

  const completedLessons = new Set(progress.map((p) => p.lessonId));

  // Tentativas do aluno nas provas deste curso (uma query só).
  const quizIds = modules
    .map((m) => m.quiz?.id)
    .filter((id): id is string => Boolean(id));
  const attempts = quizIds.length
    ? await db.quizAttempt.findMany({
        where: { studentId, quizId: { in: quizIds } },
        orderBy: { attemptNumber: "asc" },
        select: { quizId: true, status: true, score: true },
      })
    : [];
  const attemptsByQuiz = new Map<string, typeof attempts>();
  for (const a of attempts) {
    const arr = attemptsByQuiz.get(a.quizId) ?? [];
    arr.push(a);
    attemptsByQuiz.set(a.quizId, arr);
  }

  return modules.map((m) => {
    const isLocked = locked.has(m.id);
    const lessons = m.lessons.map((l) => ({
      id: l.id,
      title: l.title,
      isRequired: l.isRequired,
      completed: completedLessons.has(l.id),
    }));

    let quiz: ModuleQuizState | null = null;
    const q = m.quiz;
    if (q && q.isPublished && q._count.questions > 0) {
      const qa = attemptsByQuiz.get(q.id) ?? [];
      const passed = qa.some((a) => a.status === "PASSED");
      const pendingGrading = qa.some((a) => a.status === "PENDING_GRADING");
      const last = qa.length ? qa[qa.length - 1] : null;
      const scores = qa
        .map((a) => a.score)
        .filter((s): s is number => s != null);
      const bestScore = scores.length ? Math.max(...scores) : null;
      const requiredLessonsDone = lessons
        .filter((l) => l.isRequired)
        .every((l) => l.completed);
      const attemptsUsed = qa.length;
      const attemptsLeft =
        q.maxAttempts != null ? Math.max(0, q.maxAttempts - attemptsUsed) : null;
      const canTake =
        !isLocked &&
        !passed &&
        !pendingGrading &&
        requiredLessonsDone &&
        (attemptsLeft == null || attemptsLeft > 0);

      quiz = {
        id: q.id,
        title: q.title,
        passingScore: q.passingScore,
        blocksProgress: q.blocksProgress,
        questionCount: q._count.questions,
        requiredLessonsDone,
        passed,
        pendingGrading,
        bestScore,
        lastStatus: last?.status ?? null,
        attemptsUsed,
        maxAttempts: q.maxAttempts,
        attemptsLeft,
        canTake,
      };
    }

    return { id: m.id, title: m.title, locked: isLocked, lessons, quiz };
  });
}

// ---------------------------------------------------------------------------
// Aluno: fazer a prova
// ---------------------------------------------------------------------------

/** Prova para o aluno responder (sem revelar quais opções são corretas). */
export async function getQuizForStudent(studentId: string, quizId: string) {
  const quiz = await db.quiz.findFirst({
    where: { id: quizId, isPublished: true },
    include: {
      module: { select: { id: true, title: true } },
      course: { select: { id: true, slug: true, title: true } },
      questions: {
        orderBy: { orderIndex: "asc" },
        select: {
          id: true,
          type: true,
          statement: true,
          points: true,
          options: {
            orderBy: { orderIndex: "asc" },
            select: { id: true, text: true }, // sem isCorrect
          },
        },
      },
    },
  });
  if (!quiz) return null;
  if (!(await isEnrolled(studentId, quiz.courseId))) return null;

  const attempts = await db.quizAttempt.findMany({
    where: { studentId, quizId },
    orderBy: { attemptNumber: "desc" },
    select: { id: true, status: true, score: true, attemptNumber: true, submittedAt: true },
  });

  const locked = await getLockedModuleIds(studentId, quiz.courseId);

  return { quiz, attempts, locked: locked.has(quiz.moduleId) };
}

/** Calcula nota 0–10 a partir dos pontos obtidos e do total. */
function toScore(earned: number, total: number): number {
  return total > 0 ? Math.round((earned / total) * 10) : 0;
}

/**
 * Registra uma tentativa do aluno: valida acesso/trava/limite, corrige as
 * objetivas e, se houver dissertativa, deixa PENDING_GRADING.
 */
export async function submitQuizAttempt(
  studentId: string,
  quizId: string,
  submission: QuizSubmissionInput,
): Promise<
  | { ok: false; error: string }
  | { ok: true; attemptId: string; status: "PENDING_GRADING" | "PASSED" | "FAILED"; score: number | null }
> {
  const quiz = await db.quiz.findFirst({
    where: { id: quizId, isPublished: true },
    include: {
      questions: { include: { options: { select: { id: true, isCorrect: true } } } },
    },
  });
  if (!quiz) return { ok: false, error: "Prova não disponível." };
  if (!(await isEnrolled(studentId, quiz.courseId)))
    return { ok: false, error: "Sem acesso a esta prova." };

  // Trava de progressão.
  const locked = await getLockedModuleIds(studentId, quiz.courseId);
  if (locked.has(quiz.moduleId))
    return { ok: false, error: "Este módulo está bloqueado." };

  // Aulas obrigatórias do módulo concluídas?
  const [requiredTotal, requiredDone] = await Promise.all([
    db.lesson.count({ where: { moduleId: quiz.moduleId, isRequired: true } }),
    db.lessonProgress.count({
      where: {
        studentId,
        status: "COMPLETED",
        lesson: { moduleId: quiz.moduleId, isRequired: true },
      },
    }),
  ]);
  if (requiredTotal > 0 && requiredDone < requiredTotal)
    return { ok: false, error: "Conclua as aulas do módulo antes da prova." };

  // Já aprovado? Não refaz.
  const alreadyPassed = await db.quizAttempt.findFirst({
    where: { studentId, quizId, status: "PASSED" },
    select: { id: true },
  });
  if (alreadyPassed) return { ok: false, error: "Você já foi aprovado nesta prova." };

  // Tentativa pendente de correção bloqueia novo envio.
  const pending = await db.quizAttempt.findFirst({
    where: { studentId, quizId, status: "PENDING_GRADING" },
    select: { id: true },
  });
  if (pending)
    return { ok: false, error: "Há uma tentativa aguardando correção." };

  // Limite de tentativas.
  const used = await db.quizAttempt.count({ where: { studentId, quizId } });
  if (quiz.maxAttempts != null && used >= quiz.maxAttempts)
    return { ok: false, error: "Limite de tentativas atingido." };

  // Correção das objetivas.
  const answerMap = new Map(submission.answers.map((a) => [a.questionId, a]));
  let earned = 0;
  let total = 0;
  let hasPending = false;
  const rows = quiz.questions.map((q) => {
    total += q.points;
    const a = answerMap.get(q.id);
    if (q.type === "OPEN") {
      hasPending = true;
      return {
        questionId: q.id,
        selectedOptionIds: [],
        textAnswer: a?.textAnswer?.trim() || "",
        awardedPoints: 0,
        isCorrect: null as boolean | null,
      };
    }
    const correctIds = q.options
      .filter((o) => o.isCorrect)
      .map((o) => o.id)
      .sort();
    const optionIds = new Set(q.options.map((o) => o.id));
    const selected = (a?.selectedOptionIds ?? [])
      .filter((id) => optionIds.has(id))
      .sort();
    const isCorrect =
      correctIds.length > 0 &&
      selected.length === correctIds.length &&
      selected.every((id, i) => id === correctIds[i]);
    const pts = isCorrect ? q.points : 0;
    earned += pts;
    return {
      questionId: q.id,
      selectedOptionIds: selected,
      textAnswer: null as string | null,
      awardedPoints: pts,
      isCorrect,
    };
  });

  const status = hasPending
    ? "PENDING_GRADING"
    : toScore(earned, total) >= quiz.passingScore
      ? "PASSED"
      : "FAILED";
  const score = hasPending ? null : toScore(earned, total);

  const attempt = await db.quizAttempt.create({
    data: {
      organizationId: quiz.organizationId,
      quizId,
      studentId,
      attemptNumber: used + 1,
      status,
      score,
      gradedAt: hasPending ? null : new Date(),
      answers: { create: rows },
    },
    select: { id: true },
  });

  return { ok: true, attemptId: attempt.id, status, score };
}

// ---------------------------------------------------------------------------
// Dono: correção das dissertativas
// ---------------------------------------------------------------------------

/** Tentativas aguardando correção (dissertativa) da organização. */
export async function listPendingAttempts(organizationId: string) {
  const attempts = await db.quizAttempt.findMany({
    where: { organizationId, status: "PENDING_GRADING" },
    orderBy: { submittedAt: "asc" },
    select: {
      id: true,
      studentId: true,
      submittedAt: true,
      quiz: {
        select: {
          title: true,
          module: { select: { title: true } },
          course: { select: { title: true } },
        },
      },
    },
  });
  const studentNames = await resolveStudentNames(attempts.map((a) => a.studentId));
  return attempts.map((a) => ({
    ...a,
    studentName: studentNames.get(a.studentId) ?? "Aluno",
  }));
}

/** Detalhe de uma tentativa para correção (respostas + questões). */
export async function getAttemptForGrading(
  organizationId: string,
  attemptId: string,
) {
  const attempt = await db.quizAttempt.findFirst({
    where: { id: attemptId, organizationId },
    include: {
      quiz: {
        select: {
          title: true,
          passingScore: true,
          module: { select: { title: true } },
          course: { select: { title: true } },
        },
      },
      answers: {
        include: {
          question: {
            include: { options: { orderBy: { orderIndex: "asc" } } },
          },
        },
      },
    },
  });
  if (!attempt) return null;
  const names = await resolveStudentNames([attempt.studentId]);
  // Mantém a ordem das questões.
  attempt.answers.sort(
    (a, b) => a.question.orderIndex - b.question.orderIndex,
  );
  return { attempt, studentName: names.get(attempt.studentId) ?? "Aluno" };
}

/**
 * Aplica as notas das dissertativas e finaliza a tentativa (APROVADO/REPROVADO).
 */
export async function gradeOpenAnswers(
  organizationId: string,
  attemptId: string,
  input: QuizGradeInput,
): Promise<{ ok: boolean; error?: string; status?: "PASSED" | "FAILED"; score?: number }> {
  const attempt = await db.quizAttempt.findFirst({
    where: { id: attemptId, organizationId, status: "PENDING_GRADING" },
    include: {
      quiz: { select: { passingScore: true } },
      answers: { include: { question: { select: { points: true, type: true } } } },
    },
  });
  if (!attempt) return { ok: false, error: "Tentativa não encontrada ou já corrigida." };

  const gradeMap = new Map(input.grades.map((g) => [g.answerId, g.awardedPoints]));

  // Confere que todas as dissertativas receberam nota.
  const openAnswers = attempt.answers.filter((a) => a.question.type === "OPEN");
  for (const a of openAnswers) {
    if (!gradeMap.has(a.id))
      return { ok: false, error: "Atribua nota a todas as respostas dissertativas." };
  }

  const updates = [];
  let earned = 0;
  let total = 0;
  for (const a of attempt.answers) {
    total += a.question.points;
    if (a.question.type === "OPEN") {
      const pts = Math.max(0, Math.min(gradeMap.get(a.id) ?? 0, a.question.points));
      earned += pts;
      updates.push(
        db.quizAnswer.update({
          where: { id: a.id },
          data: { awardedPoints: pts, isCorrect: pts > 0 },
        }),
      );
    } else {
      earned += a.awardedPoints; // objetivas já corrigidas no envio
    }
  }

  const score = toScore(earned, total);
  const status = score >= attempt.quiz.passingScore ? "PASSED" : "FAILED";

  await db.$transaction([
    ...updates,
    db.quizAttempt.update({
      where: { id: attempt.id },
      data: { score, status, gradedAt: new Date() },
    }),
  ]);

  return { ok: true, status, score };
}

/** Resolve nomes de alunos por id (studentId não tem FK). */
async function resolveStudentNames(ids: string[]) {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map<string, string>();
  const users = await db.user.findMany({
    where: { id: { in: unique } },
    select: { id: true, name: true },
  });
  return new Map(users.map((u) => [u.id, u.name]));
}
