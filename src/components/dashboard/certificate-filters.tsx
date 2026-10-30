"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";

const selectClass =
  "h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

/**
 * Filtros da listagem de certificados (busca, curso, intervalo de emissão e
 * presença presencial). Reflete o estado na URL para a página filtrar no
 * servidor (?q=&courseId=&from=&to=&attended=).
 */
export function CertificateFilters({
  q,
  courseId,
  from,
  to,
  attended,
  courses,
}: {
  q: string;
  courseId: string;
  from: string;
  to: string;
  attended: string;
  courses: { id: string; title: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState(q);
  const [state, setState] = useState({ courseId, from, to, attended });

  function pushUrl(
    nextSearch: string,
    next: { courseId: string; from: string; to: string; attended: string },
  ) {
    const params = new URLSearchParams();
    if (nextSearch.trim()) params.set("q", nextSearch.trim());
    if (next.courseId) params.set("courseId", next.courseId);
    if (next.from) params.set("from", next.from);
    if (next.to) params.set("to", next.to);
    if (next.attended) params.set("attended", next.attended);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  // Busca com debounce; os demais filtros navegam no onChange.
  useEffect(() => {
    const t = setTimeout(() => pushUrl(search, state), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function update(patch: Partial<typeof state>) {
    const next = { ...state, ...patch };
    setState(next);
    pushUrl(search, next);
  }

  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
      <div className="relative flex-1 lg:min-w-[220px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por aluno ou curso…"
          className="pl-9"
          aria-label="Buscar"
        />
      </div>

      <select
        value={state.courseId}
        onChange={(e) => update({ courseId: e.target.value })}
        className={selectClass}
        aria-label="Filtrar por curso"
      >
        <option value="">Todos os cursos</option>
        {courses.map((c) => (
          <option key={c.id} value={c.id}>
            {c.title}
          </option>
        ))}
      </select>

      <select
        value={state.attended}
        onChange={(e) => update({ attended: e.target.value })}
        className={selectClass}
        aria-label="Filtrar por presença"
      >
        <option value="">Presencial: todos</option>
        <option value="yes">Esteve presente</option>
        <option value="no">Sem presença</option>
      </select>

      <label className="flex items-center gap-1 text-sm text-muted-foreground">
        De
        <input
          type="date"
          value={state.from}
          onChange={(e) => update({ from: e.target.value })}
          className={selectClass}
          aria-label="Emitido a partir de"
        />
      </label>
      <label className="flex items-center gap-1 text-sm text-muted-foreground">
        até
        <input
          type="date"
          value={state.to}
          onChange={(e) => update({ to: e.target.value })}
          className={selectClass}
          aria-label="Emitido até"
        />
      </label>
    </div>
  );
}
