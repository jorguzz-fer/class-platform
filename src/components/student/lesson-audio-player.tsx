"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { completeLessonAction } from "@/lib/actions/progress-actions";

/**
 * Player de áudio da aula. Conclui automaticamente quando o áudio termina
 * (como o vídeo). O aluno também pode usar o botão "Marcar como concluída".
 */
export function LessonAudioPlayer({
  url,
  lessonId,
  courseSlug,
  completed,
}: {
  url: string;
  lessonId: string;
  courseSlug: string;
  completed: boolean;
}) {
  const router = useRouter();
  const done = useRef(completed);

  async function onEnded() {
    if (done.current) return;
    done.current = true;
    try {
      const r = await completeLessonAction(lessonId, courseSlug);
      if (r.ok) {
        toast.success("Aula concluída.");
        router.refresh();
      }
    } catch {
      /* best-effort */
    }
  }

  return (
    <Card>
      <CardContent className="py-6">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <audio
          controls
          preload="metadata"
          src={url}
          onEnded={onEnded}
          className="w-full"
        />
      </CardContent>
    </Card>
  );
}
