import Link from "next/link";
import { GraduationCap } from "lucide-react";

import { ModeToggle } from "@/components/mode-toggle";

/**
 * Cabeçalho das páginas públicas da escola (catálogo e curso). Mostra o logo /
 * nome da escola (link para o catálogo) e o seletor de tema. Responsivo.
 */
export function PublicHeader({
  schoolSlug,
  name,
  logoUrl,
}: {
  schoolSlug: string;
  name: string;
  logoUrl?: string | null;
}) {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
      <div className="container flex h-16 items-center justify-between gap-2">
        <Link href={`/s/${schoolSlug}`} className="flex items-center gap-2 font-semibold">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={name} className="h-8 w-8 rounded object-cover" />
          ) : (
            <GraduationCap className="h-6 w-6" />
          )}
          <span className="truncate">{name}</span>
        </Link>
        <ModeToggle />
      </div>
    </header>
  );
}
