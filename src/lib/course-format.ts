/** Formatação compartilhada para exibição pública de cursos. */

export function formatPrice(p: unknown, currency: string): string {
  const v = Number(p ?? 0);
  if (v === 0) return "Gratuito";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(v);
}

const LEVEL_LABELS: Record<string, string> = {
  BEGINNER: "Iniciante",
  INTERMEDIATE: "Intermediário",
  ADVANCED: "Avançado",
  ALL_LEVELS: "Todos os níveis",
};

export function levelLabel(level: string | null | undefined): string | null {
  if (!level) return null;
  return LEVEL_LABELS[level] ?? null;
}
