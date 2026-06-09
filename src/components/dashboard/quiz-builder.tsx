"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronUp,
  ChevronDown,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Sparkles,
} from "lucide-react";
import type { QuestionType } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  createQuizAction,
  updateQuizSettingsAction,
  setQuizPublishedAction,
  deleteQuizAction,
  addQuestionAction,
  updateQuestionAction,
  deleteQuestionAction,
  reorderQuestionsAction,
  generateQuestionsAction,
  type ActionResult,
} from "@/lib/actions/quiz-actions";
import type { QuizQuestionInput } from "@/lib/validators";

type OptionView = { id: string; text: string; isCorrect: boolean };
type QuestionView = {
  id: string;
  type: QuestionType;
  statement: string;
  points: number;
  options: OptionView[];
};
type QuizView = {
  id: string;
  title: string;
  passingScore: number;
  maxAttempts: number | null;
  blocksProgress: boolean;
  isPublished: boolean;
  questions: QuestionView[];
};

const TYPE_LABELS: Record<QuestionType, string> = {
  SINGLE_CHOICE: "Múltipla escolha",
  TRUE_FALSE: "Verdadeiro/Falso",
  MULTI_SELECT: "Múltipla seleção",
  OPEN: "Dissertativa",
};

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export function QuizBuilder({
  courseId,
  moduleId,
  quiz,
  aiEnabled,
}: {
  courseId: string;
  moduleId: string;
  quiz: QuizView | null;
  aiEnabled: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editingSettings, setEditingSettings] = useState(false);
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);

  function handle(fn: () => Promise<ActionResult>, success: string, onOk?: () => void) {
    startTransition(async () => {
      const result = await fn();
      if (result?.error) {
        toast.error(result.error);
      } else if (result?.fieldErrors) {
        toast.error("Verifique os campos do formulário.");
      } else {
        toast.success(success);
        onOk?.();
        router.refresh();
      }
    });
  }

  // Sem prova ainda: formulário de criação.
  if (!quiz) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="mb-3 text-sm text-muted-foreground">
            Crie a prova deste módulo definindo a nota de corte.
          </p>
          <SettingsForm
            pending={pending}
            onSubmit={(fd) =>
              handle(
                () => createQuizAction(courseId, moduleId, null, fd),
                "Prova criada.",
              )
            }
          />
        </CardContent>
      </Card>
    );
  }

  const canPublish = quiz.questions.length > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Cabeçalho: status + publicar + excluir */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="flex items-center gap-2">
            <Badge variant={quiz.isPublished ? "default" : "secondary"}>
              {quiz.isPublished ? "Publicada" : "Rascunho"}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Nota de corte {quiz.passingScore}/10 ·{" "}
              {quiz.maxAttempts == null
                ? "tentativas ilimitadas"
                : `${quiz.maxAttempts} tentativa(s)`}
              {quiz.blocksProgress ? " · trava o próximo módulo" : ""}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={quiz.isPublished ? "outline" : "default"}
              size="sm"
              disabled={pending || (!quiz.isPublished && !canPublish)}
              onClick={() =>
                handle(
                  () =>
                    setQuizPublishedAction(
                      courseId,
                      moduleId,
                      quiz.id,
                      !quiz.isPublished,
                    ),
                  quiz.isPublished ? "Prova despublicada." : "Prova publicada.",
                )
              }
              title={
                !quiz.isPublished && !canPublish
                  ? "Adicione ao menos uma questão"
                  : undefined
              }
            >
              {quiz.isPublished ? "Despublicar" : "Publicar"}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              disabled={pending}
              onClick={() => {
                if (!confirm("Excluir esta prova e suas questões?")) return;
                handle(
                  () => deleteQuizAction(courseId, moduleId, quiz.id),
                  "Prova excluída.",
                  () => router.push(`/dashboard/courses/${courseId}/modules`),
                );
              }}
              title="Excluir prova"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Configurações */}
      <Card>
        <CardContent className="p-4">
          {editingSettings ? (
            <SettingsForm
              defaults={quiz}
              pending={pending}
              onCancel={() => setEditingSettings(false)}
              onSubmit={(fd) =>
                handle(
                  () =>
                    updateQuizSettingsAction(courseId, moduleId, quiz.id, null, fd),
                  "Configurações salvas.",
                  () => setEditingSettings(false),
                )
              }
            />
          ) : (
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{quiz.title}</p>
                <p className="text-sm text-muted-foreground">
                  Aprovado com nota ≥ {quiz.passingScore}.
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                disabled={pending}
                onClick={() => setEditingSettings(true)}
                title="Editar configurações"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Questões */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Questões ({quiz.questions.length})
        </h2>

        {aiEnabled && <AiGenerator courseId={courseId} moduleId={moduleId} quizId={quiz.id} />}

        {quiz.questions.map((q, idx) => (
          <Card key={q.id}>
            <CardContent className="p-4">
              {editingQuestionId === q.id ? (
                <QuestionForm
                  defaults={q}
                  pending={pending}
                  onCancel={() => setEditingQuestionId(null)}
                  onSubmit={(input) =>
                    handle(
                      () => updateQuestionAction(courseId, moduleId, q.id, input),
                      "Questão atualizada.",
                      () => setEditingQuestionId(null),
                    )
                  }
                />
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col gap-1">
                      <span className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {TYPE_LABELS[q.type]}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {q.points} {q.points === 1 ? "ponto" : "pontos"}
                        </span>
                      </span>
                      <p className="text-sm font-medium">
                        {idx + 1}. {q.statement}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={pending || idx === 0}
                        onClick={() => moveQuestion(idx, -1)}
                        title="Mover para cima"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={pending || idx === quiz.questions.length - 1}
                        onClick={() => moveQuestion(idx, 1)}
                        title="Mover para baixo"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={pending}
                        onClick={() => setEditingQuestionId(q.id)}
                        title="Editar questão"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={pending}
                        onClick={() => {
                          if (!confirm("Excluir esta questão?")) return;
                          handle(
                            () =>
                              deleteQuestionAction(courseId, moduleId, q.id),
                            "Questão excluída.",
                          );
                        }}
                        title="Excluir questão"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {q.type === "OPEN" ? (
                    <p className="pl-2 text-xs italic text-muted-foreground">
                      Dissertativa — corrigida manualmente.
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-1 pl-2">
                      {q.options.map((o) => (
                        <li
                          key={o.id}
                          className="flex items-center gap-2 text-sm"
                        >
                          {o.isCorrect ? (
                            <Check className="h-4 w-4 text-primary" />
                          ) : (
                            <X className="h-4 w-4 text-muted-foreground/40" />
                          )}
                          <span
                            className={
                              o.isCorrect
                                ? "font-medium"
                                : "text-muted-foreground"
                            }
                          >
                            {o.text}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {addingQuestion ? (
          <Card>
            <CardContent className="p-4">
              <QuestionForm
                pending={pending}
                onCancel={() => setAddingQuestion(false)}
                onSubmit={(input) =>
                  handle(
                    () => addQuestionAction(courseId, moduleId, quiz.id, input),
                    "Questão adicionada.",
                    () => setAddingQuestion(false),
                  )
                }
              />
            </CardContent>
          </Card>
        ) : (
          <Button
            className="w-fit gap-1"
            disabled={pending}
            onClick={() => setAddingQuestion(true)}
          >
            <Plus className="h-4 w-4" />
            Adicionar questão
          </Button>
        )}
      </div>
    </div>
  );

  function moveQuestion(index: number, dir: -1 | 1) {
    if (!quiz) return;
    const target = index + dir;
    if (target < 0 || target >= quiz.questions.length) return;
    const ids = quiz.questions.map((q) => q.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    handle(
      () => reorderQuestionsAction(courseId, moduleId, quiz.id, ids),
      "Ordem atualizada.",
    );
  }
}

// ---- Formulário de configurações -----------------------------------------

function SettingsForm({
  defaults,
  pending,
  onCancel,
  onSubmit,
}: {
  defaults?: {
    title: string;
    passingScore: number;
    maxAttempts: number | null;
    blocksProgress: boolean;
  };
  pending: boolean;
  onCancel?: () => void;
  onSubmit: (formData: FormData) => void;
}) {
  return (
    <form action={onSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor="quiz-title">Título da prova</Label>
        <Input
          id="quiz-title"
          name="title"
          required
          defaultValue={defaults?.title ?? "Prova do módulo"}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="quiz-passing">Nota de corte (0–10)</Label>
          <Input
            id="quiz-passing"
            name="passingScore"
            type="number"
            min="0"
            max="10"
            required
            defaultValue={defaults?.passingScore ?? 7}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="quiz-attempts">Máx. de tentativas</Label>
          <Input
            id="quiz-attempts"
            name="maxAttempts"
            type="number"
            min="1"
            max="50"
            placeholder="Ilimitado"
            defaultValue={defaults?.maxAttempts ?? ""}
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="blocksProgress"
          defaultChecked={defaults?.blocksProgress ?? true}
        />
        Travar o próximo módulo até o aluno ser aprovado
      </label>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          Salvar
        </Button>
        {onCancel && (
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}

// ---- Formulário de questão (com editor de opções) ------------------------

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: "SINGLE_CHOICE", label: "Múltipla escolha (1 correta)" },
  { value: "MULTI_SELECT", label: "Múltipla seleção (várias corretas)" },
  { value: "TRUE_FALSE", label: "Verdadeiro/Falso" },
  { value: "OPEN", label: "Dissertativa" },
];

function defaultOptions(type: QuestionType): OptionView[] {
  if (type === "TRUE_FALSE")
    return [
      { id: "v", text: "Verdadeiro", isCorrect: true },
      { id: "f", text: "Falso", isCorrect: false },
    ];
  if (type === "OPEN") return [];
  return [
    { id: rid(), text: "", isCorrect: true },
    { id: rid(), text: "", isCorrect: false },
  ];
}

function rid() {
  return Math.random().toString(36).slice(2);
}

function QuestionForm({
  defaults,
  pending,
  onCancel,
  onSubmit,
}: {
  defaults?: QuestionView;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (input: QuizQuestionInput) => void;
}) {
  const [type, setType] = useState<QuestionType>(defaults?.type ?? "SINGLE_CHOICE");
  const [statement, setStatement] = useState(defaults?.statement ?? "");
  const [points, setPoints] = useState(defaults?.points ?? 1);
  const [options, setOptions] = useState<OptionView[]>(
    defaults?.options.length ? defaults.options : defaultOptions(type),
  );

  function changeType(next: QuestionType) {
    setType(next);
    setOptions(defaultOptions(next));
  }

  function setCorrectSingle(id: string) {
    setOptions((opts) => opts.map((o) => ({ ...o, isCorrect: o.id === id })));
  }
  function toggleCorrectMulti(id: string) {
    setOptions((opts) =>
      opts.map((o) => (o.id === id ? { ...o, isCorrect: !o.isCorrect } : o)),
    );
  }
  function setOptionText(id: string, text: string) {
    setOptions((opts) => opts.map((o) => (o.id === id ? { ...o, text } : o)));
  }
  function addOption() {
    setOptions((opts) => [...opts, { id: rid(), text: "", isCorrect: false }]);
  }
  function removeOption(id: string) {
    setOptions((opts) => (opts.length <= 2 ? opts : opts.filter((o) => o.id !== id)));
  }

  function submit() {
    onSubmit({
      type,
      statement,
      points,
      options:
        type === "OPEN"
          ? []
          : options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })),
    });
  }

  const isChoice = type !== "OPEN";
  const isMulti = type === "MULTI_SELECT";
  const isTrueFalse = type === "TRUE_FALSE";

  return (
    <div className="flex flex-col gap-3 rounded-md border p-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="flex flex-col gap-2">
          <Label>Tipo de questão</Label>
          <select
            className={selectClass}
            value={type}
            onChange={(e) => changeType(e.target.value as QuestionType)}
          >
            {QUESTION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex w-28 flex-col gap-2">
          <Label>Pontos</Label>
          <Input
            type="number"
            min="1"
            max="100"
            value={points}
            onChange={(e) => setPoints(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Enunciado</Label>
        <Textarea
          rows={2}
          value={statement}
          onChange={(e) => setStatement(e.target.value)}
          placeholder="Escreva a pergunta..."
        />
      </div>

      {isChoice && (
        <div className="flex flex-col gap-2">
          <Label>
            Opções{" "}
            <span className="font-normal text-muted-foreground">
              ({isMulti ? "marque todas as corretas" : "marque a correta"})
            </span>
          </Label>
          {options.map((o) => (
            <div key={o.id} className="flex items-center gap-2">
              <input
                type={isMulti ? "checkbox" : "radio"}
                name="correct"
                checked={o.isCorrect}
                onChange={() =>
                  isMulti ? toggleCorrectMulti(o.id) : setCorrectSingle(o.id)
                }
              />
              <Input
                value={o.text}
                disabled={isTrueFalse}
                onChange={(e) => setOptionText(o.id, e.target.value)}
                placeholder="Texto da opção"
              />
              {!isTrueFalse && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={options.length <= 2}
                  onClick={() => removeOption(o.id)}
                  title="Remover opção"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          {!isTrueFalse && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit gap-1"
              onClick={addOption}
            >
              <Plus className="h-4 w-4" />
              Adicionar opção
            </Button>
          )}
        </div>
      )}

      {type === "OPEN" && (
        <p className="text-xs italic text-muted-foreground">
          A resposta dissertativa será corrigida manualmente por você na aba
          Correções.
        </p>
      )}

      <div className="flex gap-2">
        <Button type="button" size="sm" disabled={pending} onClick={submit}>
          Salvar questão
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

// ---- Geração por IA (Fase B) ---------------------------------------------

function AiGenerator({
  courseId,
  moduleId,
  quizId,
}: {
  courseId: string;
  moduleId: string;
  quizId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  function generate() {
    startTransition(async () => {
      const res = await generateQuestionsAction(courseId, moduleId, quizId, text);
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success(`${res?.count ?? 0} questão(ões) gerada(s). Revise abaixo.`);
      setText("");
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="w-fit gap-1"
        onClick={() => setOpen(true)}
      >
        <Sparkles className="h-4 w-4" />
        Gerar com IA
      </Button>
    );
  }

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <p className="text-sm font-medium">Gerar questões com IA</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Cole o conteúdo ou um banco de questões (com gabarito). A IA monta as
          questões como rascunho — você revisa e ajusta antes de publicar.
        </p>
        <Textarea
          rows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            "Ex.: Por que a NR-01 é importante?\nA) ...\nB) ...\nGabarito: B"
          }
        />
        <div className="flex gap-2">
          <Button type="button" size="sm" disabled={pending} onClick={generate}>
            {pending ? "Gerando..." : "Gerar questões"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => setOpen(false)}
          >
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
