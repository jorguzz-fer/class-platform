"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronUp,
  ChevronDown,
  Plus,
  Trash2,
  Pencil,
  Video,
  FileText,
  File,
  Music,
  Radio,
  Code,
  ClipboardList,
} from "lucide-react";
import type { LessonContentType } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { LessonMaterials } from "@/components/dashboard/lesson-materials";
import { listVideoProviders } from "@/lib/video/registry";
import {
  createModuleAction,
  updateModuleAction,
  deleteModuleAction,
  reorderModulesAction,
  createLessonAction,
  deleteLessonAction,
  reorderLessonsAction,
  type ActionResult,
} from "@/lib/actions/curriculum-actions";

export type LessonView = {
  id: string;
  title: string;
  contentType: LessonContentType;
  isRequired: boolean;
  isPreview: boolean;
  attachments: { id: string; fileName: string; fileUrl: string }[];
};

export type ModuleQuizSummary = {
  questionCount: number;
  isPublished: boolean;
};

export type ModuleView = {
  id: string;
  title: string;
  description: string | null;
  lessons: LessonView[];
  quiz: ModuleQuizSummary | null;
};

const contentIcons: Record<LessonContentType, typeof Video> = {
  VIDEO: Video,
  TEXT: FileText,
  PDF: File,
  AUDIO: Music,
  LIVE: Radio,
  EMBED: Code,
};

const CONTENT_TYPES: { value: LessonContentType; label: string }[] = [
  { value: "VIDEO", label: "Vídeo" },
  { value: "TEXT", label: "Texto" },
  { value: "PDF", label: "PDF" },
  { value: "AUDIO", label: "Áudio" },
  { value: "LIVE", label: "Ao vivo" },
  { value: "EMBED", label: "Embed" },
];

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export function CurriculumManager({
  courseId,
  modules,
}: {
  courseId: string;
  modules: ModuleView[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showModuleForm, setShowModuleForm] = useState(false);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [addingLessonTo, setAddingLessonTo] = useState<string | null>(null);

  function handle(fn: () => Promise<ActionResult>, success: string) {
    startTransition(async () => {
      const result = await fn();
      if (result?.error) {
        toast.error(result.error);
      } else if (result?.fieldErrors) {
        toast.error("Verifique os campos do formulário.");
      } else {
        toast.success(success);
        setShowModuleForm(false);
        setEditingModuleId(null);
        setAddingLessonTo(null);
        router.refresh();
      }
    });
  }

  function moveModule(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= modules.length) return;
    const ids = modules.map((m) => m.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    handle(() => reorderModulesAction(courseId, ids), "Ordem atualizada.");
  }

  function moveLesson(moduleId: string, lessons: LessonView[], index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= lessons.length) return;
    const ids = lessons.map((l) => l.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    handle(() => reorderLessonsAction(courseId, moduleId, ids), "Ordem atualizada.");
  }

  return (
    <div className="flex flex-col gap-4">
      {modules.length === 0 && !showModuleForm && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhum módulo ainda. Crie o primeiro módulo para adicionar aulas.
          </CardContent>
        </Card>
      )}

      {modules.map((mod, mIdx) => (
        <Card key={mod.id}>
          <CardContent className="flex flex-col gap-3 p-4">
            {editingModuleId === mod.id ? (
              <ModuleForm
                defaults={mod}
                pending={pending}
                onCancel={() => setEditingModuleId(null)}
                onSubmit={(fd) =>
                  handle(
                    () => updateModuleAction(courseId, mod.id, null, fd),
                    "Módulo atualizado.",
                  )
                }
              />
            ) : (
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {mIdx + 1}. {mod.title}
                  </p>
                  {mod.description && (
                    <p className="text-sm text-muted-foreground">{mod.description}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={pending || mIdx === 0}
                    onClick={() => moveModule(mIdx, -1)}
                    title="Mover para cima"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={pending || mIdx === modules.length - 1}
                    onClick={() => moveModule(mIdx, 1)}
                    title="Mover para baixo"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={pending}
                    onClick={() => setEditingModuleId(mod.id)}
                    title="Editar módulo"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={pending}
                    onClick={() => {
                      if (!confirm("Excluir este módulo e suas aulas?")) return;
                      handle(
                        () => deleteModuleAction(courseId, mod.id),
                        "Módulo excluído.",
                      );
                    }}
                    title="Excluir módulo"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Aulas */}
            <ul className="flex flex-col gap-1 border-l pl-4">
              {mod.lessons.map((lesson, lIdx) => {
                const Icon = contentIcons[lesson.contentType];
                return (
                  <li
                    key={lesson.id}
                    className="flex flex-col gap-1 rounded-md px-2 py-1.5 hover:bg-muted/40"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-sm">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        {lesson.title}
                        {lesson.isPreview && (
                          <Badge variant="outline" className="text-[10px]">
                            Prévia
                          </Badge>
                        )}
                        {!lesson.isRequired && (
                          <Badge variant="secondary" className="text-[10px]">
                            Opcional
                          </Badge>
                        )}
                      </span>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={pending || lIdx === 0}
                          onClick={() => moveLesson(mod.id, mod.lessons, lIdx, -1)}
                          title="Mover para cima"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={pending || lIdx === mod.lessons.length - 1}
                          onClick={() => moveLesson(mod.id, mod.lessons, lIdx, 1)}
                          title="Mover para baixo"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={pending}
                          onClick={() => {
                            if (!confirm("Excluir esta aula?")) return;
                            handle(
                              () => deleteLessonAction(courseId, lesson.id),
                              "Aula excluída.",
                            );
                          }}
                          title="Excluir aula"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <LessonMaterials
                      courseId={courseId}
                      lessonId={lesson.id}
                      attachments={lesson.attachments}
                    />
                  </li>
                );
              })}
            </ul>

            {addingLessonTo === mod.id ? (
              <LessonForm
                pending={pending}
                selectClass={selectClass}
                contentTypes={CONTENT_TYPES}
                onCancel={() => setAddingLessonTo(null)}
                onSubmit={(fd) =>
                  handle(
                    () => createLessonAction(courseId, mod.id, null, fd),
                    "Aula adicionada.",
                  )
                }
              />
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-fit gap-1"
                disabled={pending}
                onClick={() => setAddingLessonTo(mod.id)}
              >
                <Plus className="h-4 w-4" />
                Adicionar aula
              </Button>
            )}

            {/* Prova do módulo */}
            <div className="mt-1 flex items-center justify-between gap-2 border-t pt-3">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <ClipboardList className="h-4 w-4" />
                Prova do módulo
                {mod.quiz && (
                  <Badge
                    variant={mod.quiz.isPublished ? "default" : "secondary"}
                    className="text-[10px]"
                  >
                    {mod.quiz.isPublished ? "Publicada" : "Rascunho"} ·{" "}
                    {mod.quiz.questionCount}{" "}
                    {mod.quiz.questionCount === 1 ? "questão" : "questões"}
                  </Badge>
                )}
              </span>
              <Link
                href={`/dashboard/courses/${courseId}/modules/${mod.id}/quiz`}
                className="inline-flex h-8 items-center gap-1 rounded-md border px-3 text-sm font-medium hover:bg-accent"
              >
                {mod.quiz ? "Editar prova" : "Criar prova"}
              </Link>
            </div>
          </CardContent>
        </Card>
      ))}

      {showModuleForm ? (
        <Card>
          <CardContent className="p-4">
            <ModuleForm
              pending={pending}
              onCancel={() => setShowModuleForm(false)}
              onSubmit={(fd) =>
                handle(() => createModuleAction(courseId, null, fd), "Módulo criado.")
              }
            />
          </CardContent>
        </Card>
      ) : (
        <Button className="w-fit gap-1" disabled={pending} onClick={() => setShowModuleForm(true)}>
          <Plus className="h-4 w-4" />
          Novo módulo
        </Button>
      )}
    </div>
  );
}

function ModuleForm({
  defaults,
  pending,
  onCancel,
  onSubmit,
}: {
  defaults?: { title: string; description: string | null };
  pending: boolean;
  onCancel: () => void;
  onSubmit: (formData: FormData) => void;
}) {
  return (
    <form
      action={onSubmit}
      className="flex flex-col gap-3"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="module-title">Título do módulo</Label>
        <Input id="module-title" name="title" defaultValue={defaults?.title} required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="module-desc">Descrição</Label>
        <Textarea
          id="module-desc"
          name="description"
          rows={2}
          defaultValue={defaults?.description ?? ""}
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          Salvar
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

function LessonForm({
  pending,
  selectClass,
  contentTypes,
  onCancel,
  onSubmit,
}: {
  pending: boolean;
  selectClass: string;
  contentTypes: { value: LessonContentType; label: string }[];
  onCancel: () => void;
  onSubmit: (formData: FormData) => void;
}) {
  return (
    <form action={onSubmit} className="flex flex-col gap-3 rounded-md border p-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor="lesson-title">Título da aula</Label>
        <Input id="lesson-title" name="title" required />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="lesson-type">Tipo de conteúdo</Label>
          <select id="lesson-type" name="contentType" className={selectClass} defaultValue="VIDEO">
            {contentTypes.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="lesson-duration">Duração (min)</Label>
          <Input id="lesson-duration" name="durationMinutes" type="number" min="0" />
        </div>
      </div>

      <VideoSourceFields />

      <div className="flex flex-col gap-2">
        <Label htmlFor="lesson-text">Conteúdo em texto (opcional)</Label>
        <Textarea id="lesson-text" name="textContent" rows={2} />
      </div>

      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isRequired" defaultChecked /> Obrigatória
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isPreview" /> Prévia gratuita
        </label>
      </div>

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          Adicionar
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

/**
 * Seletor de fonte de vídeo + input único. O usuário escolhe o provider
 * (YouTube, Vimeo, arquivo direto) e cola a URL/ID; a normalização final é
 * feita no servidor (parse do registry). Enviamos videoProvider + videoSource.
 */
function VideoSourceFields() {
  const providers = listVideoProviders();
  const [provider, setProvider] = useState(providers[0]?.id ?? "");
  const current = providers.find((p) => p.id === provider);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="flex flex-col gap-2">
        <Label htmlFor="lesson-provider">Fonte do vídeo</Label>
        <select
          id="lesson-provider"
          name="videoProvider"
          className={selectClass}
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
        >
          {providers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="lesson-source">URL ou ID do vídeo</Label>
        <Input
          id="lesson-source"
          name="videoSource"
          placeholder={current?.inputHint ?? "Cole a URL ou ID"}
        />
      </div>
    </div>
  );
}
