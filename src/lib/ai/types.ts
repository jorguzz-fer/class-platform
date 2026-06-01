/**
 * Tipos do módulo de IA (Fase 4). Mantidos provider-agnósticos para que a
 * implementação real (Anthropic) e o mock compartilhem o mesmo contrato.
 */

export interface CourseOutlineInput {
  topic: string;
  level?: string;
  audience?: string;
}

export interface GeneratedLesson {
  title: string;
  description: string;
}

export interface GeneratedModule {
  title: string;
  description: string;
  lessons: GeneratedLesson[];
}

export interface CourseOutline {
  title: string;
  subtitle: string;
  modules: GeneratedModule[];
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

export interface GeneratedQuiz {
  questions: QuizQuestion[];
}

export interface LessonSummaryInput {
  title: string;
  content: string;
}

export interface TutorMessage {
  role: "user" | "assistant";
  content: string;
}

export interface TutorContext {
  courseTitle: string;
  lessonTitle?: string;
  lessonContent?: string;
}

/**
 * Contrato do provider de IA. Implementado pelo mock (padrão) e pelo provider
 * Anthropic (quando ANTHROPIC_API_KEY está configurado).
 */
export interface AIProvider {
  /** Identifica o provider ("mock" | "anthropic") — usado na UI. */
  readonly name: string;

  generateCourseOutline(input: CourseOutlineInput): Promise<CourseOutline>;
  generateQuiz(input: LessonSummaryInput): Promise<GeneratedQuiz>;
  summarizeLesson(input: LessonSummaryInput): Promise<string>;
  /** Resposta do tutor em streaming (async iterable de chunks de texto). */
  tutorReply(
    context: TutorContext,
    messages: TutorMessage[],
  ): AsyncIterable<string>;
}
