"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";

const STATUSES = [
  { value: "", label: "Todos os status" },
  { value: "PUBLISHED", label: "Publicado" },
  { value: "DRAFT", label: "Rascunho" },
  { value: "ARCHIVED", label: "Arquivado" },
];

const selectClass =
  "h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

/**
 * Filtros da lista de cursos (busca por título + status). Reflete o estado na
 * URL (SSR-friendly): a página lê os searchParams e filtra no banco.
 */
export function CourseFilters({ q, status }: { q: string; status: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState(q);
  const [statusVal, setStatusVal] = useState(status);

  function pushUrl(nextSearch: string, nextStatus: string) {
    const params = new URLSearchParams();
    if (nextSearch.trim()) params.set("q", nextSearch.trim());
    if (nextStatus) params.set("status", nextStatus);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  // Busca com debounce (evita uma navegação a cada tecla).
  useEffect(() => {
    const t = setTimeout(() => pushUrl(search, statusVal), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por título…"
          className="pl-9"
          aria-label="Buscar cursos por título"
        />
      </div>
      <select
        value={statusVal}
        onChange={(e) => {
          setStatusVal(e.target.value);
          pushUrl(search, e.target.value);
        }}
        className={selectClass}
        aria-label="Filtrar por status"
      >
        {STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}
