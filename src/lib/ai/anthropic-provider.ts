import Anthropic from "@anthropic-ai/sdk";

import type {
  AIProvider,
  CourseOutline,
  CourseOutlineInput,
  DocumentCourseInput,
  DocumentCourseOutline,
  PdfCourseInput,
  GeneratedQuiz,
  GeneratedQuestionSet,
  QuestionsFromTextInput,
  LessonSummaryInput,
  TutorContext,
  TutorMessage,
} from "./types";

/**
 * Provider de IA usando a API da Anthropic (Claude). Ativado apenas quando
 * ANTHROPIC_API_KEY está definido (ver factory em ./index.ts).
 *
 * Práticas aplicadas (skill claude-api):
 * - Modelo claude-opus-4-8 com adaptive thinking.
 * - Prompt caching no system prompt estável (cache_control ephemeral).
 * - Structured outputs (output_config.format) para as tarefas que retornam JSON.
 * - Streaming na resposta do tutor (saída potencialmente longa).
 */
const MODEL = "claude-opus-4-8";

// System prompt estável (cacheável) — conteúdo volátil vai nas mensagens.
const SYSTEM_INSTRUCTOR =
  "Você é um especialista em design instrucional para cursos online em português do Brasil. " +
  "Gere conteúdo claro, prático e bem estruturado.";

// Schema do curso gerado a partir de documento/PDF (cada aula carrega o conteúdo
// em texto). Reutilizado pelas gerações por texto e por PDF.
const COURSE_DOC_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    subtitle: { type: "string" },
    description: { type: "string" },
    modules: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          lessons: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                title: { type: "string" },
                content: { type: "string" },
              },
              required: ["title", "content"],
            },
          },
        },
        required: ["title", "description", "lessons"],
      },
    },
  },
  required: ["title", "subtitle", "description", "modules"],
};

// Instrução comum para organizar material em curso (texto ou PDF).
function courseFromMaterialInstruction(level?: string, audience?: string): string {
  return (
    "Organize o material em um curso estruturado (título, subtítulo, descrição " +
    "e módulos com aulas). Cada aula deve ter um título e o CONTEÚDO em texto, " +
    "redigido a partir do material (organize e melhore a didática, mas NÃO " +
    "invente fatos que não estejam no material). Quando o material for um PDF de " +
    "slides/imagens, TRANSCREVA o texto das lâminas. Divida em módulos coerentes, " +
    "cada um com 2 a 6 aulas." +
    (level ? ` Nível: ${level}.` : "") +
    (audience ? ` Público: ${audience}.` : "")
  );
}

export class AnthropicAIProvider implements AIProvider {
  readonly name = "anthropic";
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async generateCourseOutline(input: CourseOutlineInput): Promise<CourseOutline> {
    const schema = {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        subtitle: { type: "string" },
        modules: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              lessons: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                  },
                  required: ["title", "description"],
                },
              },
            },
            required: ["title", "description", "lessons"],
          },
        },
      },
      required: ["title", "subtitle", "modules"],
    };

    const message = await this.client.messages.create({
      model: MODEL,
      max_tokens: 4000,
      thinking: { type: "adaptive" },
      system: [
        { type: "text", text: SYSTEM_INSTRUCTOR, cache_control: { type: "ephemeral" } },
      ],
      output_config: { format: { type: "json_schema", schema } },
      messages: [
        {
          role: "user",
          content:
            `Crie a estrutura de um curso sobre: ${input.topic}.` +
            (input.level ? ` Nível: ${input.level}.` : "") +
            (input.audience ? ` Público: ${input.audience}.` : "") +
            ` Gere de 3 a 5 módulos, cada um com 2 a 4 aulas.`,
        },
      ],
    });

    return this.extractJson<CourseOutline>(message);
  }

  async generateCourseFromDocument(
    input: DocumentCourseInput,
  ): Promise<DocumentCourseOutline> {
    // Limita o texto enviado (contexto/custo). 80k caracteres cobrem documentos
    // longos sem estourar o orçamento de tokens.
    const content = input.content.slice(0, 80000);

    const message = await this.client.messages.create({
      model: MODEL,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      system: [
        { type: "text", text: SYSTEM_INSTRUCTOR, cache_control: { type: "ephemeral" } },
      ],
      output_config: { format: { type: "json_schema", schema: COURSE_DOC_SCHEMA } },
      messages: [
        {
          role: "user",
          content:
            courseFromMaterialInstruction(input.level, input.audience) +
            `\n\nDocumento:\n${content}`,
        },
      ],
    });

    return this.extractJson<DocumentCourseOutline>(message);
  }

  async generateCourseFromPdf(
    input: PdfCourseInput,
  ): Promise<DocumentCourseOutline> {
    // O Claude lê o PDF nativamente (visão): cobre PDFs de texto E de imagens/
    // slides — neste caso transcrevendo o conteúdo das lâminas.
    const message = await this.client.messages.create({
      model: MODEL,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      system: [
        { type: "text", text: SYSTEM_INSTRUCTOR, cache_control: { type: "ephemeral" } },
      ],
      output_config: { format: { type: "json_schema", schema: COURSE_DOC_SCHEMA } },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: input.pdfBase64,
              },
            },
            { type: "text", text: courseFromMaterialInstruction(input.level, input.audience) },
          ],
        },
      ],
    });

    return this.extractJson<DocumentCourseOutline>(message);
  }

  async generateQuiz(input: LessonSummaryInput): Promise<GeneratedQuiz> {
    const schema = {
      type: "object",
      additionalProperties: false,
      properties: {
        questions: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              question: { type: "string" },
              options: { type: "array", items: { type: "string" } },
              correctIndex: { type: "integer" },
            },
            required: ["question", "options", "correctIndex"],
          },
        },
      },
      required: ["questions"],
    };

    const message = await this.client.messages.create({
      model: MODEL,
      max_tokens: 2000,
      thinking: { type: "adaptive" },
      system: [
        { type: "text", text: SYSTEM_INSTRUCTOR, cache_control: { type: "ephemeral" } },
      ],
      output_config: { format: { type: "json_schema", schema } },
      messages: [
        {
          role: "user",
          content:
            `Gere um quiz de 3 a 5 questões de múltipla escolha (4 alternativas cada) ` +
            `sobre a aula "${input.title}". Conteúdo:\n\n${input.content}`,
        },
      ],
    });

    return this.extractJson<GeneratedQuiz>(message);
  }

  async generateQuestionsFromText(
    input: QuestionsFromTextInput,
  ): Promise<GeneratedQuestionSet> {
    const schema = {
      type: "object",
      additionalProperties: false,
      properties: {
        questions: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              type: {
                type: "string",
                enum: ["SINGLE_CHOICE", "TRUE_FALSE", "MULTI_SELECT", "OPEN"],
              },
              statement: { type: "string" },
              options: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    text: { type: "string" },
                    isCorrect: { type: "boolean" },
                  },
                  required: ["text", "isCorrect"],
                },
              },
            },
            required: ["type", "statement", "options"],
          },
        },
      },
      required: ["questions"],
    };

    const message = await this.client.messages.create({
      model: MODEL,
      max_tokens: 8000,
      thinking: { type: "adaptive" },
      system: [
        { type: "text", text: SYSTEM_INSTRUCTOR, cache_control: { type: "ephemeral" } },
      ],
      output_config: { format: { type: "json_schema", schema } },
      messages: [
        {
          role: "user",
          content:
            "A partir do texto abaixo, monte questões de prova.\n" +
            "Regras:\n" +
            "- Se o texto JÁ contiver questões prontas (enunciado, alternativas A/B/C/D e gabarito tipo 'Gabarito: B'), EXTRAIA-as fielmente e marque como correta a alternativa do gabarito.\n" +
            "- Se for apenas conteúdo, GERE questões de múltipla escolha cobrindo os pontos principais.\n" +
            "- Tipos: SINGLE_CHOICE (1 correta), TRUE_FALSE (opções 'Verdadeiro'/'Falso'), MULTI_SELECT (várias corretas), OPEN (dissertativa, sem opções).\n" +
            "- Em SINGLE_CHOICE e TRUE_FALSE marque exatamente uma correta; em MULTI_SELECT, uma ou mais; OPEN deve vir com options vazio.\n" +
            "- Não invente gabarito quando ele estiver explícito no texto.\n\n" +
            `Texto:\n${input.text}`,
        },
      ],
    });

    return this.extractJson<GeneratedQuestionSet>(message);
  }

  async summarizeLesson(input: LessonSummaryInput): Promise<string> {
    const message = await this.client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      thinking: { type: "adaptive" },
      system: [
        { type: "text", text: SYSTEM_INSTRUCTOR, cache_control: { type: "ephemeral" } },
      ],
      messages: [
        {
          role: "user",
          content:
            `Resuma a aula "${input.title}" em tópicos claros para o aluno revisar. ` +
            `Conteúdo:\n\n${input.content}`,
        },
      ],
    });

    return message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
  }

  async *tutorReply(
    context: TutorContext,
    messages: TutorMessage[],
  ): AsyncIterable<string> {
    const contextText =
      `Curso: ${context.courseTitle}.` +
      (context.lessonTitle ? ` Aula atual: ${context.lessonTitle}.` : "") +
      (context.lessonContent ? `\n\nConteúdo da aula:\n${context.lessonContent}` : "");

    const system =
      "Você é um tutor paciente e didático que responde dúvidas de alunos em português do Brasil. " +
      "Responda de forma concisa e use o contexto do curso quando relevante.";

    const stream = this.client.messages.stream({
      model: MODEL,
      max_tokens: 2000,
      thinking: { type: "adaptive" },
      system: [
        { type: "text", text: system, cache_control: { type: "ephemeral" } },
      ],
      messages: [
        { role: "user", content: `Contexto:\n${contextText}` },
        { role: "assistant", content: "Entendi o contexto. Pode perguntar." },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        yield event.delta.text;
      }
    }
  }

  /** Extrai o JSON estruturado da resposta (output_config.format). */
  private extractJson<T>(message: Anthropic.Message): T {
    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    return JSON.parse(text) as T;
  }
}
