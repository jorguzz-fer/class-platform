import type { EnrollmentStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";

const config: Record<
  EnrollmentStatus,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  PENDING: { label: "Pendente", variant: "outline" },
  ACTIVE: { label: "Ativa", variant: "default" },
  COMPLETED: { label: "Concluída", variant: "secondary" },
  EXPIRED: { label: "Expirada", variant: "outline" },
  CANCELED: { label: "Cancelada", variant: "destructive" },
};

export function EnrollmentStatusBadge({ status }: { status: EnrollmentStatus }) {
  const { label, variant } = config[status];
  return <Badge variant={variant}>{label}</Badge>;
}
