"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import type { QuestionType } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { submitQuizAttemptAction } from "@/lib/actions/quiz-actions";

type Question = {
  id: string;
  type: QuestionType;
  statement: string;
  points: number;
  options: { id: string; text: string }[];
};

type Result = { status: string; score: number | null };

export function QuizRunner({
  quizId,
  courseSlug,
  passingScore,
  questions,
}: {
  quizId: string;
  courseSlug: string;
  passingScore: number;
  questions: Question[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<Result | null>(null);
  // Respostas: opções marcadas (escolha) ou texto (dissertativa).
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [texts, setTexts] = useState<Record<string, string>>({});

  function pickSingle(qid: string, oid: string) {
    setSelected((s) => ({ ...s, [qid]: [oid] }));
  }
  function toggleMulti(qid: string, oid: string) {
    setSelected((s) => {
      const cur = s[qid] ?? [];
      return {
        ...s,
        [qid]: cur.includes(oid) ? cur.filter((x) => x !== oid) : [...cur, oid],
      };
    });
  }

  function submit() {
    // Validação leve no cliente: tudo respondido.
    for (const q of questions) {
      if (q.type === "OPEN") {
        if (!texts[q.id]?.trim()) {
          toast.error("Responda todas as questões antes de enviar.");
          return;
        }
      } else if (!(selected[q.id]?.length > 0)) {
        toast.error("Responda todas as questões antes de enviar.");
        return;
      }
    }

    if (!confirm("Enviar a prova? Não será possível alterar as respostas.")) return;

    startTransition(async () => {
      const res = await submitQuizAttemptAction(quizId, courseSlug, {
        answers: questions.map((q) => ({
          questionId: q.id,
          selectedOptionIds: q.type === "OPEN" ? [] : selected[q.id] ?? [],
          textAnswer: q.type === "OPEN" ? texts[q.id] ?? "" : undefined,
        })),
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setResult({ status: res.status, score: res.score });
      router.refresh();
    });
  }

  if (result) {
    return <ResultCard result={result} passingScore={passingScore} courseSlug={courseSlug} />;
  }

  return (
    <div className="flex flex-col gap-4">
      {questions.map((q, idx) => (
        <Card key={q.id}>
          <CardContent className="flex flex-col gap-3 py-4">
            <p className="text-sm font-medium">
              {idx + 1}. {q.statement}
            </p>

            {q.type === "OPEN" ? (
              <Textarea
                rows={4}
                value={texts[q.id] ?? ""}
                onChange={(e) =>
                  setTexts((t) => ({ ...t, [q.id]: e.target.value }))
                }
                placeholder="Escreva sua resposta..."
              />
            ) : (
              <ul className="flex flex-col gap-2">
                {q.options.map((o) => {
                  const isMulti = q.type === "MULTI_SELECT";
                  const checked = (selected[q.id] ?? []).includes(o.id);
                  return (
                    <li key={o.id}>
                      <label className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted/40">
                        <input
                          type={isMulti ? "checkbox" : "radio"}
                          name={q.id}
                          checked={checked}
                          onChange={() =>
                            isMulti
                              ? toggleMulti(q.id, o.id)
                              : pickSingle(q.id, o.id)
                          }
                        />
                        {o.text}
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      ))}

      <Button className="w-fit" disabled={pending} onClick={submit}>
        {pending ? "Enviando..." : "Enviar prova"}
      </Button>
    </div>
  );
}

function ResultCard({
  result,
  passingScore,
  courseSlug,
}: {
  result: Result;
  passingScore: number;
  courseSlug: string;
}) {
  const router = useRouter();
  const goBack = () => router.push(`/app/courses/${courseSlug}`);

  if (result.status === "PENDING_GRADING") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <Clock className="h-8 w-8 text-muted-foreground" />
          <p className="font-medium">Prova enviada!</p>
          <p className="text-sm text-muted-foreground">
            Há questões dissertativas aguardando correção. Você verá o resultado
            em breve.
          </p>
          <Button variant="outline" size="sm" onClick={goBack}>
            Voltar ao curso
          </Button>
        </CardContent>
      </Card>
    );
  }

  const approved = result.status === "PASSED";
  return (
    <Card className={approved ? "border-primary" : undefined}>
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        {approved ? (
          <CheckCircle2 className="h-8 w-8 text-primary" />
        ) : (
          <XCircle className="h-8 w-8 text-destructive" />
        )}
        <p className="font-medium">
          {approved ? "Aprovado!" : "Não atingiu a nota de corte."} Nota{" "}
          {result.score}/10.
        </p>
        <p className="text-sm text-muted-foreground">
          {approved
            ? "Você liberou o próximo módulo."
            : `Era necessário ao menos ${passingScore}/10.`}
        </p>
        <Button variant="outline" size="sm" onClick={goBack}>
          Voltar ao curso
        </Button>
      </CardContent>
    </Card>
  );
}
