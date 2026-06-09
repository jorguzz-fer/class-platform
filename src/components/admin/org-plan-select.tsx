"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { setOrganizationPlanAction } from "@/lib/actions/admin-actions";

const selectClass =
  "h-8 rounded-md border border-input bg-transparent px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export function OrgPlanSelect({
  organizationId,
  planId,
  plans,
}: {
  organizationId: string;
  planId: string | null;
  plans: { id: string; name: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <select
      className={selectClass}
      defaultValue={planId ?? ""}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value;
        if (!next) return;
        startTransition(async () => {
          const result = await setOrganizationPlanAction(organizationId, next);
          if (result?.error) toast.error(result.error);
          else {
            toast.success("Plano atualizado.");
            router.refresh();
          }
        });
      }}
    >
      {planId == null && <option value="">—</option>}
      {plans.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
}
