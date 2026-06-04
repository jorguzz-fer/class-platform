"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { completeLessonAction } from "@/lib/actions/progress-actions";

export function LessonCompleteButton({
  lessonId,
  courseSlug,
  completed,
  nextLessonId,
}: {
  lessonId: string;
  courseSlug: string;
  completed: boolean;
  nextLessonId: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleComplete() {
    startTransition(async () => {
      const result = await completeLessonAction(lessonId, courseSlug);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (result.courseCompleted) {
        toast.success("Parabéns! Você concluiu o curso. 🎉");
      } else {
        toast.success("Aula concluída.");
      }
      if (nextLessonId) {
        router.push(`/app/courses/${courseSlug}/lessons/${nextLessonId}`);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex items-center gap-3">
      {completed ? (
        <span className="flex items-center gap-2 text-sm text-primary">
          <CheckCircle2 className="h-4 w-4" />
          Aula concluída
        </span>
      ) : (
        <Button onClick={handleComplete} disabled={pending}>
          {pending ? "Salvando..." : "Marcar como concluída"}
        </Button>
      )}
      {completed && nextLessonId && (
        <Button
          variant="outline"
          onClick={() =>
            router.push(`/app/courses/${courseSlug}/lessons/${nextLessonId}`)
          }
        >
          Próxima aula
        </Button>
      )}
    </div>
  );
}
