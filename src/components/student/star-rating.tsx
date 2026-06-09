"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

/**
 * Avaliação por estrelas (1–5) interativa. Recebe a nota atual e uma ação
 * (server action já vinculada aos ids) que registra a nota escolhida.
 */
export function StarRating({
  value,
  onRate,
  size = "md",
}: {
  value: number | null;
  onRate: (stars: number) => Promise<{ error?: string } | null>;
  size?: "sm" | "md";
}) {
  const [current, setCurrent] = useState(value ?? 0);
  const [hover, setHover] = useState(0);
  const [pending, startTransition] = useTransition();

  function rate(stars: number) {
    const previous = current;
    setCurrent(stars);
    startTransition(async () => {
      const result = await onRate(stars);
      if (result?.error) {
        toast.error(result.error);
        setCurrent(previous);
      } else {
        toast.success("Avaliação registrada. Obrigado!");
      }
    });
  }

  const display = hover || current;
  const px = size === "sm" ? "h-5 w-5" : "h-7 w-7";

  return (
    <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={pending}
          onMouseEnter={() => setHover(n)}
          onClick={() => rate(n)}
          className="transition-transform hover:scale-110 disabled:opacity-60"
          title={`${n} estrela${n > 1 ? "s" : ""}`}
          aria-label={`Avaliar com ${n} de 5`}
        >
          <Star
            className={cn(
              px,
              n <= display
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground",
            )}
          />
        </button>
      ))}
    </div>
  );
}
