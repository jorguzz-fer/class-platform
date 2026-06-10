import type {
  AIProvider,
  CourseOutline,
  CourseOutlineInput,
  DocumentCourseInput,
  DocumentCourseOutline,
  PdfCourseInput,
  GeneratedQuiz,
  GeneratedQuestionSet,
  GeneratedQuestionDraft,
  QuestionsFromTextInput,
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

  async generateCourseFromDocument(
    input: DocumentCourseInput,
  ): Promise<DocumentCourseOutline> {
    // Mock: quebra o texto em blocos e os distribui como aulas. Sem API key, o
    // resultado é simples — serve para testar o fluxo, não para produção.
    const text = input.content.trim();
    const paragraphs = text
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    const chunks = paragraphs.length > 0 ? paragraphs : [text];

    // Agrupa em até 4 aulas por módulo.
    const perLesson = Math.max(1, Math.ceil(chunks.length / 6));
    const lessons = [];
    for (let i = 0; i < chunks.length; i += perLesson) {
      const slice = chunks.slice(i, i + perLesson);
      lessons.push({
        title: `Aula ${lessons.length + 1}`,
        content: slice.join("\n\n"),
      });
    }

    return {
      title: "Curso a partir do documento",
      subtitle: "Conteúdo organizado automaticamente (rascunho)",
      description: text.slice(0, 200),
      modules: [
        {
          title: "Conteúdo do documento",
          description: "Aulas geradas a partir do material enviado.",
          lessons: lessons.length > 0 ? lessons : [{ title: "Aula 1", content: text }],
        },
      ],
    };
  }

  async generateCourseFromPdf(
    input: PdfCourseInput,
  ): Promise<DocumentCourseOutline> {
    // O mock não tem visão: não consegue ler o PDF. Devolve um rascunho mínimo
    // explicando que é preciso configurar a IA real (ANTHROPIC_API_KEY).
    const audience = input.audience ? ` Público: ${input.audience}.` : "";
    return {
      title: "Curso a partir de PDF",
      subtitle: "Configure a IA para ler o documento",
      description:
        "A leitura de PDF (inclusive de imagens/slides) exige a IA real. " +
        "Configure ANTHROPIC_API_KEY para gerar o curso a partir do arquivo." +
        audience,
      modules: [
        {
          title: "Conteúdo do PDF",
          description: "Será preenchido quando a IA real estiver configurada.",
          lessons: [
            {
              title: "Aula 1",
              content:
                "Sem a IA real configurada, não é possível transcrever o PDF.",
            },
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

  async generateQuestionsFromText(
    input: QuestionsFromTextInput,
  ): Promise<GeneratedQuestionSet> {
    // Parser heurístico do formato "enunciado + A)/B)/C)/D) + Gabarito: X".
    // Permite usar o recurso sem API key (e casa com o modelo de .docx do dono).
    const parsed = parseFormattedQuestions(input.text);
    if (parsed.length > 0) return { questions: parsed };

    // Sem questões reconhecíveis: devolve um rascunho genérico para edição.
    const snippet = input.text.trim().slice(0, 80) || "o conteúdo informado";
    return {
      questions: [
        {
          type: "SINGLE_CHOICE",
          statement: `(rascunho) Qual a ideia central de: "${snippet}..."?`,
          options: [
            { text: "A ideia principal do texto", isCorrect: true },
            { text: "Um detalhe secundário", isCorrect: false },
            { text: "Algo não mencionado", isCorrect: false },
            { text: "Nenhuma das anteriores", isCorrect: false },
          ],
        },
        {
          type: "TRUE_FALSE",
          statement: "(rascunho) O texto trata do tema proposto.",
          options: [
            { text: "Verdadeiro", isCorrect: true },
            { text: "Falso", isCorrect: false },
          ],
        },
        {
          type: "OPEN",
          statement: "(rascunho) Explique com suas palavras o tema do texto.",
          options: [],
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

/**
 * Parser heurístico do formato comum de banco de questões:
 *   Enunciado (opcionalmente "1." na frente)
 *   A) alternativa
 *   B) alternativa
 *   ...
 *   Gabarito: B
 * Linhas de cabeçalho (sem alternativas) são ignoradas. Quando não há gabarito
 * explícito, marca a primeira alternativa como correta (o dono ajusta depois).
 */
function parseFormattedQuestions(text: string): GeneratedQuestionDraft[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const optionRe = /^([A-E])\)\s*(.+)$/i;
  const gabaritoRe = /gabarito\s*[:\-]?\s*\*{0,2}\s*([A-E])/i;
  const questions: GeneratedQuestionDraft[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line || optionRe.test(line) || gabaritoRe.test(line)) {
      i++;
      continue;
    }

    // Alternativas logo abaixo. Tolera linhas em branco entre elas (extratores
    // como o mammoth separam cada parágrafo por uma linha vazia).
    let j = i + 1;
    const opts: { letter: string; text: string }[] = [];
    while (j < lines.length) {
      if (!lines[j]) {
        j++;
        continue;
      }
      const m = lines[j].match(optionRe);
      if (!m) break;
      opts.push({ letter: m[1].toUpperCase(), text: m[2].trim() });
      j++;
    }

    if (opts.length < 2) {
      // Não é uma questão (provável cabeçalho) — segue adiante.
      i++;
      continue;
    }

    // Procura o gabarito nas próximas linhas próximas.
    let correct: string | null = null;
    let k = j;
    while (k < lines.length && k < j + 3) {
      const g = lines[k].match(gabaritoRe);
      if (g) {
        correct = g[1].toUpperCase();
        break;
      }
      k++;
    }

    const statement = line.replace(/^\d+[.)]\s*/, "").trim();
    const options = opts.map((o) => ({
      text: o.text,
      isCorrect: correct ? o.letter === correct : false,
    }));
    if (!correct) options[0].isCorrect = true;

    questions.push({ type: "SINGLE_CHOICE", statement, options });
    i = correct ? k + 1 : j;
  }

  return questions;
}
