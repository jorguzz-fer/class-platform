"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Paperclip, Plus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addLessonAttachmentAction,
  deleteLessonAttachmentAction,
} from "@/lib/actions/curriculum-actions";

export type AttachmentView = { id: string; fileName: string; fileUrl: string };

/**
 * Materiais de uma aula (por link). Lista os existentes e permite adicionar
 * nome + URL ou remover. Upload de arquivo de verdade fica para depois — por
 * ora o material é hospedado fora e referenciado por link.
 */
export function LessonMaterials({
  courseId,
  lessonId,
  attachments,
}: {
  courseId: string;
  lessonId: string;
  attachments: AttachmentView[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [fileName, setName] = useState("");
  const [fileUrl, setUrl] = useState("");

  function add() {
    const fd = new FormData();
    fd.set("fileName", fileName);
    fd.set("fileUrl", fileUrl);
    startTransition(async () => {
      const result = await addLessonAttachmentAction(courseId, lessonId, null, fd);
      if (result?.error) toast.error(result.error);
      else if (result?.fieldErrors) toast.error("Verifique nome e URL do material.");
      else {
        toast.success("Material adicionado.");
        setName("");
        setUrl("");
        setAdding(false);
        router.refresh();
      }
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const result = await deleteLessonAttachmentAction(courseId, id);
      if (result?.error) toast.error(result.error);
      else {
        toast.success("Material removido.");
        router.refresh();
      }
    });
  }

  return (
    <div className="mt-1 flex flex-col gap-1 pl-6">
      {attachments.map((a) => (
        <div key={a.id} className="flex items-center gap-2 text-xs text-muted-foreground">
          <Paperclip className="h-3 w-3 shrink-0" />
          <a
            href={a.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate hover:underline"
          >
            {a.fileName}
          </a>
          <button
            type="button"
            disabled={pending}
            onClick={() => remove(a.id)}
            className="text-muted-foreground hover:text-destructive"
            title="Remover material"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      ))}

      {adding ? (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={fileName}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome (ex.: Apostila PDF)"
            className="h-7 w-44 text-xs"
          />
          <Input
            value={fileUrl}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://link-do-arquivo"
            className="h-7 w-56 text-xs"
          />
          <Button size="sm" className="h-7" disabled={pending} onClick={add}>
            Adicionar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7"
            disabled={pending}
            onClick={() => setAdding(false)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => setAdding(true)}
          className="flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-3 w-3" />
          Adicionar material
        </button>
      )}
    </div>
  );
}
