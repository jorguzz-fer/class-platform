"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { completeLessonAction } from "@/lib/actions/progress-actions";

type Embed =
  | { type: "iframe"; src: string }
  | { type: "native"; src: string }
  | { type: "none" };

// Tipagem mínima da API de IFrame do YouTube (carregada por script externo).
interface YTPlayer {
  destroy?: () => void;
}
interface YTNamespace {
  Player: new (
    el: HTMLElement,
    opts: {
      videoId: string;
      host?: string;
      events?: { onStateChange?: (e: { data: number }) => void };
    },
  ) => YTPlayer;
  PlayerState: { ENDED: number };
}
declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

/**
 * Player da aula com auto-conclusão ao terminar o vídeo.
 * - Arquivo direto (<video>): evento `ended`.
 * - YouTube: API de IFrame (onStateChange === ENDED).
 * - Outros embeds (Vimeo etc.): renderiza o iframe normal, sem auto-concluir
 *   (o botão "Marcar como concluída" continua disponível).
 */
export function LessonVideoPlayer({
  embed,
  provider,
  videoId,
  lessonId,
  courseSlug,
  completed,
}: {
  embed: Embed;
  provider: string | null;
  videoId: string | null;
  lessonId: string;
  courseSlug: string;
  completed: boolean;
}) {
  const router = useRouter();
  const doneRef = useRef(completed);
  const firingRef = useRef(false);
  const ytHostRef = useRef<HTMLDivElement>(null);

  async function markComplete() {
    if (doneRef.current || firingRef.current) return;
    firingRef.current = true;
    const result = await completeLessonAction(lessonId, courseSlug);
    if (result.ok) {
      doneRef.current = true;
      toast.success(
        result.courseCompleted
          ? "Parabéns! Você concluiu o curso. 🎉"
          : "Aula concluída.",
      );
      router.refresh();
    } else {
      firingRef.current = false;
    }
  }

  const isYouTube = provider === "youtube" && !!videoId;

  useEffect(() => {
    if (!isYouTube || !videoId) return;
    const id = videoId;
    let player: YTPlayer | undefined;
    let cancelled = false;

    function create() {
      if (cancelled || !ytHostRef.current || !window.YT) return;
      player = new window.YT.Player(ytHostRef.current, {
        videoId: id,
        host: "https://www.youtube-nocookie.com",
        events: {
          onStateChange: (e) => {
            if (window.YT && e.data === window.YT.PlayerState.ENDED) {
              void markComplete();
            }
          },
        },
      });
    }

    if (window.YT?.Player) {
      create();
    } else {
      if (!document.getElementById("yt-iframe-api")) {
        const s = document.createElement("script");
        s.id = "yt-iframe-api";
        s.src = "https://www.youtube.com/iframe_api";
        document.body.appendChild(s);
      }
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        create();
      };
    }

    return () => {
      cancelled = true;
      try {
        player?.destroy?.();
      } catch {
        // ignore
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isYouTube, videoId]);

  if (embed.type === "native") {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-lg border bg-black">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          src={embed.src}
          controls
          className="h-full w-full"
          onEnded={() => void markComplete()}
        />
      </div>
    );
  }

  if (embed.type === "iframe") {
    // YouTube: a API monta o iframe dentro do host (e detecta o fim).
    if (isYouTube) {
      return (
        <div className="aspect-video w-full overflow-hidden rounded-lg border bg-black">
          <div ref={ytHostRef} className="h-full w-full" />
        </div>
      );
    }
    // Outros embeds: iframe simples (sem auto-conclusão).
    return (
      <div className="aspect-video w-full overflow-hidden rounded-lg border bg-black">
        <iframe
          src={embed.src}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="Player da aula"
        />
      </div>
    );
  }

  return null;
}
