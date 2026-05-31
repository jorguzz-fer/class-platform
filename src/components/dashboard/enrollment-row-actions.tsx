"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  cancelEnrollmentAction,
  deleteEnrollmentAction,
} from "@/lib/actions/student-actions";

export function EnrollmentRowActions({
  enrollmentId,
  canCancel,
}: {
  enrollmentId: string;
  canCancel: boolean;
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
      {canCancel && (
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => run(() => cancelEnrollmentAction(enrollmentId), "Matrícula cancelada.")}
        >
          Cancelar
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => {
          if (!confirm("Remover esta matrícula?")) return;
          run(() => deleteEnrollmentAction(enrollmentId), "Matrícula removida.");
        }}
      >
        Remover
      </Button>
    </div>
  );
}
