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

// Geração de curso a partir de um documento (PDF/DOCX/TXT). Diferente do
// outline por tema, aqui cada aula carrega o CONTEÚDO em texto, organizado a
// partir do documento — vira o corpo da aula (textContent).
export interface DocumentCourseInput {
  content: string;
  level?: string;
  audience?: string;
}

export interface GeneratedDocLesson {
  title: string;
  content: string;
}

export interface GeneratedDocModule {
  title: string;
  description: string;
  lessons: GeneratedDocLesson[];
}

export interface DocumentCourseOutline {
  title: string;
  subtitle: string;
  description: string;
  modules: GeneratedDocModule[];
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

export interface GeneratedQuiz {
  questions: QuizQuestion[];
}

// Geração de questões a partir de texto colado (Fase B). Formato alinhado ao
// builder de provas: suporta os 4 tipos e marca a(s) opção(ões) correta(s).
export type GeneratedQuestionType =
  | "SINGLE_CHOICE"
  | "TRUE_FALSE"
  | "MULTI_SELECT"
  | "OPEN";

export interface GeneratedQuestionOption {
  text: string;
  isCorrect: boolean;
}

export interface GeneratedQuestionDraft {
  type: GeneratedQuestionType;
  statement: string;
  options: GeneratedQuestionOption[]; // vazio para OPEN
}

export interface GeneratedQuestionSet {
  questions: GeneratedQuestionDraft[];
}

export interface QuestionsFromTextInput {
  /** Texto colado: pode conter questões prontas (com gabarito) ou conteúdo. */
  text: string;
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
  /** Organiza o conteúdo de um documento em curso + módulos + aulas. */
  generateCourseFromDocument(
    input: DocumentCourseInput,
  ): Promise<DocumentCourseOutline>;
  generateQuiz(input: LessonSummaryInput): Promise<GeneratedQuiz>;
  /** Monta questões de prova a partir de texto colado (Fase B). */
  generateQuestionsFromText(
    input: QuestionsFromTextInput,
  ): Promise<GeneratedQuestionSet>;
  summarizeLesson(input: LessonSummaryInput): Promise<string>;
  /** Resposta do tutor em streaming (async iterable de chunks de texto). */
  tutorReply(
    context: TutorContext,
    messages: TutorMessage[],
  ): AsyncIterable<string>;
}
