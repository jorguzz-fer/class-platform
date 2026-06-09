import Link from "next/link";
import { CheckCircle2, Circle, PlayCircle, Lock } from "lucide-react";

import { cn } from "@/lib/utils";

type LessonItem = { id: string; title: string };
type ModuleItem = { id: string; title: string; lessons: LessonItem[] };

/**
 * Currículo do curso para navegação dentro do player: lista módulos e aulas,
 * marca as concluídas (✓) e destaca a aula atual. Módulos bloqueados (prova
 * anterior não aprovada) aparecem com cadeado e não são clicáveis.
 */
export function CourseOutlineNav({
  courseSlug,
  currentLessonId,
  modules,
  completedLessonIds,
  lockedModuleIds,
}: {
  courseSlug: string;
  currentLessonId: string;
  modules: ModuleItem[];
  completedLessonIds: Set<string>;
  lockedModuleIds?: Set<string>;
}) {
  return (
    <nav className="flex flex-col gap-4">
      {modules.map((mod, idx) => {
        const locked = lockedModuleIds?.has(mod.id) ?? false;
        return (
          <div key={mod.id} className="flex flex-col gap-1">
            <p className="flex items-center gap-1 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {locked && <Lock className="h-3 w-3" />}
              {idx + 1}. {mod.title}
            </p>
            <ul className="flex flex-col">
              {mod.lessons.map((lesson) => {
                if (locked) {
                  return (
                    <li key={lesson.id}>
                      <span className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground">
                        <Lock className="h-4 w-4 shrink-0" />
                        <span className="truncate">{lesson.title}</span>
                      </span>
                    </li>
                  );
                }
                const isCurrent = lesson.id === currentLessonId;
                const done = completedLessonIds.has(lesson.id);
                const Icon = isCurrent ? PlayCircle : done ? CheckCircle2 : Circle;
                return (
                  <li key={lesson.id}>
                    <Link
                      href={`/app/courses/${courseSlug}/lessons/${lesson.id}`}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted",
                        isCurrent && "bg-muted font-medium",
                        !isCurrent && done && "text-muted-foreground",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          done ? "text-primary" : "text-muted-foreground",
                          isCurrent && "text-primary",
                        )}
                      />
                      <span className="truncate">{lesson.title}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
