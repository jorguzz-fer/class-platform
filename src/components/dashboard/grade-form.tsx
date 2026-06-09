"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { gradeAttemptAction } from "@/lib/actions/quiz-actions";

type OpenAnswer = {
  answerId: string;
  statement: string;
  points: number;
  textAnswer: string;
};

export function GradeForm({
  attemptId,
  openAnswers,
  objectiveEarned,
  totalPoints,
  passingScore,
}: {
  attemptId: string;
  openAnswers: OpenAnswer[];
  objectiveEarned: number;
  totalPoints: number;
  passingScore: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [grades, setGrades] = useState<Record<string, number>>(() =>
    Object.fromEntries(openAnswers.map((a) => [a.answerId, 0])),
  );

  // Prévia da nota final enquanto o dono digita.
  const preview = useMemo(() => {
    const openEarned = openAnswers.reduce(
      (s, a) => s + Math.max(0, Math.min(grades[a.answerId] ?? 0, a.points)),
      0,
    );
    const earned = objectiveEarned + openEarned;
    return totalPoints > 0 ? Math.round((earned / totalPoints) * 10) : 0;
  }, [grades, openAnswers, objectiveEarned, totalPoints]);

  function submit() {
    startTransition(async () => {
      const res = await gradeAttemptAction(attemptId, {
        grades: openAnswers.map((a) => ({
          answerId: a.answerId,
          awardedPoints: Math.max(0, Math.min(grades[a.answerId] ?? 0, a.points)),
        })),
      });
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Correção salva.");
      router.push("/dashboard/assessments");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Dissertativas a corrigir
      </h2>

      {openAnswers.map((a) => (
        <Card key={a.answerId}>
          <CardContent className="flex flex-col gap-3 py-4">
            <p className="text-sm font-medium">{a.statement}</p>
            <div className="whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-sm">
              {a.textAnswer || (
                <span className="italic text-muted-foreground">
                  (sem resposta)
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm">Pontos (0–{a.points}):</label>
              <Input
                type="number"
                min="0"
                max={a.points}
                className="w-24"
                value={grades[a.answerId] ?? 0}
                onChange={(e) =>
                  setGrades((g) => ({
                    ...g,
                    [a.answerId]: Number(e.target.value),
                  }))
                }
              />
            </div>
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <span className="text-sm">
            Nota final prevista:{" "}
            <strong>{preview}/10</strong>{" "}
            <span className="text-muted-foreground">
              ({preview >= passingScore ? "aprovado" : "reprovado"})
            </span>
          </span>
          <Button disabled={pending} onClick={submit}>
            {pending ? "Salvando..." : "Salvar correção"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
