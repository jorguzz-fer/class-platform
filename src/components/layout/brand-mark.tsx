import { GraduationCap } from "lucide-react";

import { cn } from "@/lib/utils";

export type Brand = { name: string; logoUrl: string | null };

/**
 * Marca da escola (logo + nome) usada nos cabeçalhos do painel e da área do
 * aluno. Se a escola tem logoUrl, mostra a imagem; senão, cai no ícone padrão.
 */
export function BrandMark({ brand, className }: { brand: Brand; className?: string }) {
  return (
    <span className={cn("flex items-center gap-2 font-semibold", className)}>
      {brand.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={brand.logoUrl}
          alt={brand.name}
          className="h-8 w-8 rounded object-cover"
        />
      ) : (
        <GraduationCap className="h-6 w-6" />
      )}
      <span className="truncate">{brand.name}</span>
    </span>
  );
}
