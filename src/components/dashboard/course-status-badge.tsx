import type { CourseStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";

const statusConfig: Record<
  CourseStatus,
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  DRAFT: { label: "Rascunho", variant: "secondary" },
  PUBLISHED: { label: "Publicado", variant: "default" },
  ARCHIVED: { label: "Arquivado", variant: "outline" },
};

export function CourseStatusBadge({ status }: { status: CourseStatus }) {
  const { label, variant } = statusConfig[status];
  return <Badge variant={variant}>{label}</Badge>;
}
