"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  approveEnrollmentAction,
  rejectEnrollmentAction,
} from "@/lib/actions/student-actions";

export function PendingEnrollmentActions({
  enrollmentId,
}: {
  enrollmentId: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function run(fn: () => Promise<{ error?: string } | null>, success: string) {
    startTransition(async () => {
      const result = await fn();
      if (result?.error) toast.error(result.error);
      else {
        toast.success(success);
        router.refresh();
      }
    });
  }

  return (
    <div className="flex justify-end gap-2">
      <Button
        size="sm"
        disabled={pending}
        onClick={() =>
          run(() => approveEnrollmentAction(enrollmentId), "Inscrição aprovada.")
        }
      >
        Aprovar
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => {
          if (!confirm("Recusar esta solicitação?")) return;
          run(() => rejectEnrollmentAction(enrollmentId), "Solicitação recusada.");
        }}
      >
        Recusar
      </Button>
    </div>
  );
}
