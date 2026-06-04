import type {
  AIProvider,
  CourseOutline,
  CourseOutlineInput,
  GeneratedQuiz,
  LessonSummaryInput,
  TutorContext,
  TutorMessage,
} from "./types";

/**
 * Provider de IA simulado (padrão). Gera respostas determinísticas e plausíveis
 * sem chamar nenhuma API externa — permite desenvolver e testar a feature sem
 * credenciais nem custo. Substituído pelo provider Anthropic quando
 * ANTHROPIC_API_KEY está definido.
 */
export class MockAIProvider implements AIProvider {
  readonly name = "mock";

  async generateCourseOutline(input: CourseOutlineInput): Promise<CourseOutline> {
    const topic = input.topic.trim();
    return {
      title: `Curso de ${topic}`,
      subtitle: `Aprenda ${topic} do zero ao avançado`,
      modules: [
        {
          title: `Introdução a ${topic}`,
          description: `Fundamentos e conceitos iniciais de ${topic}.`,
          lessons: [
            { title: `O que é ${topic}?`, description: "Visão geral e motivação." },
            { title: "Configurando o ambiente", description: "Primeiros passos práticos." },
          ],
        },
        {
          title: `${topic} na prática`,
          description: `Aplicações e exercícios de ${topic}.`,
          lessons: [
            { title: "Primeiro projeto", description: "Mão na massa." },
            { title: "Boas práticas", description: "Padrões recomendados." },
          ],
        },
        {
          title: `${topic} avançado`,
          description: `Tópicos avançados de ${topic}.`,
          lessons: [
            { title: "Otimização", description: "Desempenho e qualidade." },
            { title: "Projeto final", description: "Consolidando o aprendizado." },
          ],
        },
      ],
    };
  }

  async generateQuiz(input: LessonSummaryInput): Promise<GeneratedQuiz> {
    return {
      questions: [
        {
          question: `Qual é o tema principal da aula "${input.title}"?`,
          options: [
            "O tema central abordado na aula",
            "Um assunto não relacionado",
            "Nenhuma das anteriores",
            "Todas as anteriores",
          ],
          correctIndex: 0,
        },
        {
          question: "Qual é a melhor forma de fixar o conteúdo?",
          options: ["Ignorar", "Praticar com exercícios", "Apenas assistir", "Pular a aula"],
          correctIndex: 1,
        },
      ],
    };
  }

  async summarizeLesson(input: LessonSummaryInput): Promise<string> {
    const snippet = input.content.trim().slice(0, 200);
    return (
      `Resumo da aula "${input.title}":\n\n` +
      `Esta aula aborda os pontos principais do conteúdo apresentado. ` +
      (snippet ? `Trecho: ${snippet}...\n\n` : "") +
      `Principais aprendizados:\n` +
      `- Conceito central da aula\n` +
      `- Aplicação prática\n` +
      `- Próximos passos`
    );
  }

  async *tutorReply(
    context: TutorContext,
    messages: TutorMessage[],
  ): AsyncIterable<string> {
    const last = messages[messages.length - 1]?.content ?? "";
    const reply =
      `(tutor de demonstração) Sobre o curso "${context.courseTitle}"` +
      (context.lessonTitle ? `, aula "${context.lessonTitle}"` : "") +
      `: você perguntou "${last}". ` +
      `Esta é uma resposta simulada. Configure ANTHROPIC_API_KEY para respostas reais de IA.`;

    // Simula streaming token a token.
    for (const word of reply.split(" ")) {
      yield word + " ";
    }
  }
}
