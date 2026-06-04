"use client";

import { useActionState, useEffect, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import {
  commentOnLessonAction,
  deleteCommentAction,
  type CommunityState,
} from "@/lib/actions/community-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Comment = { id: string; authorName: string; authorId: string; content: string };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      Comentar
    </Button>
  );
}

export function LessonComments({
  lessonId,
  courseSlug,
  comments,
  currentUserId,
  isStaff,
}: {
  lessonId: string;
  courseSlug: string;
  comments: Comment[];
  currentUserId: string;
  isStaff: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const action = commentOnLessonAction.bind(null, lessonId, courseSlug);
  const [state, formAction] = useActionState<CommunityState, FormData>(action, null);

  useEffect(() => {
    if (state?.ok) {
      toast.success("Comentário enviado.");
      router.refresh();
    } else if (state?.error) toast.error(state.error);
  }, [state, router]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Comentários</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {comments.length === 0 && (
          <p className="text-sm text-muted-foreground">Seja o primeiro a comentar.</p>
        )}
        {comments.map((c) => (
          <div key={c.id} className="flex items-start justify-between gap-2 text-sm">
            <p>
              <span className="font-medium">{c.authorName}:</span> {c.content}
            </p>
            {(isStaff || c.authorId === currentUserId) && (
              <Button
                variant="ghost"
                size="icon"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await deleteCommentAction(c.id);
                    if (result?.error) toast.error(result.error);
                    else router.refresh();
                  })
                }
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
        <form action={formAction} className="flex gap-2 border-t pt-3">
          <Input name="content" placeholder="Escreva um comentário..." required />
          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  );
}
