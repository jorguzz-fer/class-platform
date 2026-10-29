"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { updateEnrollmentAction } from "@/lib/actions/student-actions";
import { cn } from "@/lib/utils";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Ativa" },
  { value: "COMPLETED", label: "Concluída" },
  { value: "EXPIRED", label: "Expirada" },
  { value: "CANCELED", label: "Cancelada" },
];

export function EditEnrollmentButton({
  enrollmentId,
  studentName,
  courseTitle,
  currentStatus,
  enrolledAt,
}: {
  enrollmentId: string;
  studentName: string;
  courseTitle: string;
  currentStatus: string;
  /** Data de matrícula no formato YYYY-MM-DD. */
  enrolledAt: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(currentStatus);
  const [date, setDate] = useState(enrolledAt);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await updateEnrollmentAction(enrollmentId, {
        status,
        enrolledAt: date,
      });
      if (result?.error) {
        toast.error(result.error);
      } else if (result?.fieldErrors) {
        toast.error("Verifique os dados informados.");
      } else {
        toast.success("Matrícula atualizada.");
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="gap-1"
        onClick={() => {
          setStatus(currentStatus);
          setDate(enrolledAt);
          setOpen(true);
        }}
      >
        <Pencil className="h-3.5 w-3.5" />
        Editar
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !pending && setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-lg border bg-background p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold">Editar matrícula</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {studentName} • {courseTitle}
            </p>

            <div className="mt-4 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="enr-status">Status</Label>
                <select
                  id="enr-status"
                  className={selectClass}
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  disabled={pending}
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="enr-date">Data de matrícula</Label>
                <input
                  id="enr-date"
                  type="date"
                  className={selectClass}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  disabled={pending}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Cancelar
              </button>
              <Button size="sm" onClick={save} disabled={pending || !date}>
                {pending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
