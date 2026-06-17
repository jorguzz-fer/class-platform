"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { completeLessonAction } from "@/lib/actions/progress-actions";

/**
 * Conclui automaticamente aulas sem "sinal de assistir" (texto, PDF/slides)
 * quando o aluno as abre. Vídeos continuam concluindo ao terminar (player).
 * Roda uma única vez por montagem e atualiza a tela ao concluir.
 */
export function LessonAutoComplete({
  lessonId,
  courseSlug,
}: {
  lessonId: string;
  courseSlug: string;
}) {
  const router = useRouter();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    completeLessonAction(lessonId, courseSlug)
      .then((r) => {
        if (r.ok) router.refresh();
      })
      .catch(() => {
        /* best-effort: não atrapalha a leitura da aula */
      });
  }, [lessonId, courseSlug, router]);

  return null;
}
