"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { CourseStatus } from "@prisma/client";

import { Button } from "@/components/ui/button";
import {
  publishCourseAction,
  archiveCourseAction,
  unarchiveCourseAction,
  deleteCourseAction,
} from "@/lib/actions/course-actions";

export function CourseActionsBar({
  courseId,
  status,
  canDelete,
}: {
  courseId: string;
  status: CourseStatus;
  canDelete: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function run(fn: () => Promise<{ error?: string } | null | void>, success: string) {
    startTransition(async () => {
      const result = await fn();
      if (result && "error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success(success);
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status !== "PUBLISHED" && status !== "ARCHIVED" && (
        <Button
          disabled={pending}
          onClick={() => run(() => publishCourseAction(courseId), "Curso publicado.")}
        >
          Publicar
        </Button>
      )}

      {status === "PUBLISHED" && (
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => run(() => archiveCourseAction(courseId), "Curso arquivado.")}
        >
          Arquivar
        </Button>
      )}

      {status === "ARCHIVED" && (
        <Button
          variant="outline"
          disabled={pending}
          onClick={() =>
            run(() => unarchiveCourseAction(courseId), "Curso reativado como rascunho.")
          }
        >
          Reativar
        </Button>
      )}

      {canDelete && (
        <Button
          variant="destructive"
          disabled={pending}
          onClick={() => {
            if (!confirm("Excluir este curso? Esta ação não pode ser desfeita.")) {
              return;
            }
            startTransition(async () => {
              await deleteCourseAction(courseId);
            });
          }}
        >
          Excluir
        </Button>
      )}
    </div>
  );
}
