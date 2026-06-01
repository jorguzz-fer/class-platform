"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { OrganizationStatus } from "@prisma/client";

import { setOrganizationStatusAction } from "@/lib/actions/admin-actions";

const STATUSES: OrganizationStatus[] = ["ACTIVE", "TRIAL", "SUSPENDED", "CANCELED"];

const selectClass =
  "h-8 rounded-md border border-input bg-transparent px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export function OrgStatusSelect({
  organizationId,
  status,
}: {
  organizationId: string;
  status: OrganizationStatus;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <select
      className={selectClass}
      defaultValue={status}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value as OrganizationStatus;
        startTransition(async () => {
          const result = await setOrganizationStatusAction(organizationId, next);
          if (result?.error) toast.error(result.error);
          else {
            toast.success("Status atualizado.");
            router.refresh();
          }
        });
      }}
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
