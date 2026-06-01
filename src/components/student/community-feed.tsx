"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Heart, MessageCircle, Pin, Trash2 } from "lucide-react";

import {
  createPostAction,
  deletePostAction,
  togglePinAction,
  toggleLikeAction,
  commentOnPostAction,
  deleteCommentAction,
  type CommunityState,
} from "@/lib/actions/community-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export type FeedPost = {
  id: string;
  content: string;
  authorName: string;
  authorId: string;
  courseTitle: string | null;
  isPinned: boolean;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  createdAt: string;
};

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

function PostButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Publicando..." : "Publicar"}
    </Button>
  );
}

export function CommunityFeed({
  posts,
  courses,
  currentUserId,
  isStaff,
}: {
  posts: FeedPost[];
  courses: { id: string; title: string }[];
  currentUserId: string;
  isStaff: boolean;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState<CommunityState, FormData>(
    createPostAction,
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      toast.success("Publicado.");
      router.refresh();
    } else if (state?.error) toast.error(state.error);
  }, [state, router]);

  return (
    <div className="flex flex-col gap-6">
      {/* Composer */}
      <Card>
        <CardContent className="py-4">
          <form action={formAction} className="flex flex-col gap-3">
            <Textarea name="content" rows={3} placeholder="Compartilhe algo com a comunidade..." required />
            {state?.fieldErrors?.content && (
              <p className="text-sm text-destructive">{state.fieldErrors.content[0]}</p>
            )}
            <div className="flex items-center justify-between gap-3">
              <select name="courseId" className={`${selectClass} max-w-[240px]`} defaultValue="">
                <option value="">Feed geral</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
              <PostButton />
            </div>
          </form>
        </CardContent>
      </Card>

      {posts.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">
          Nenhum post ainda. Seja o primeiro a publicar!
        </p>
      ) : (
        posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            currentUserId={currentUserId}
            isStaff={isStaff}
          />
        ))
      )}
    </div>
  );
}

function PostCard({
  post,
  currentUserId,
  isStaff,
}: {
  post: FeedPost;
  currentUserId: string;
  isStaff: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<
    { id: string; authorName: string; authorId: string; content: string }[] | null
  >(null);

  const canModerate = isStaff || post.authorId === currentUserId;

  function run(fn: () => Promise<{ error?: string } | { ok: boolean } | null>) {
    startTransition(async () => {
      const result = await fn();
      if (result && "error" in result && result.error) toast.error(result.error);
      else router.refresh();
    });
  }

  async function loadComments() {
    if (!showComments && comments === null) {
      const res = await fetch(`/api/community/posts/${post.id}/comments`);
      if (res.ok) setComments(await res.json());
    }
    setShowComments((s) => !s);
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-medium">{post.authorName}</span>
            {post.courseTitle && (
              <Badge variant="secondary" className="text-[10px]">{post.courseTitle}</Badge>
            )}
            {post.isPinned && <Pin className="h-3 w-3 text-primary" />}
          </div>
          <div className="flex items-center gap-1">
            {isStaff && (
              <Button
                variant="ghost"
                size="icon"
                disabled={pending}
                title={post.isPinned ? "Desafixar" : "Fixar"}
                onClick={() => run(() => togglePinAction(post.id, !post.isPinned))}
              >
                <Pin className="h-4 w-4" />
              </Button>
            )}
            {canModerate && (
              <Button
                variant="ghost"
                size="icon"
                disabled={pending}
                title="Excluir"
                onClick={() => {
                  if (!confirm("Excluir este post?")) return;
                  run(() => deletePostAction(post.id));
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <p className="whitespace-pre-wrap text-sm">{post.content}</p>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <button
            className="flex items-center gap-1 hover:text-foreground"
            disabled={pending}
            onClick={() => run(() => toggleLikeAction(post.id))}
          >
            <Heart className={post.likedByMe ? "h-4 w-4 fill-primary text-primary" : "h-4 w-4"} />
            {post.likeCount}
          </button>
          <button className="flex items-center gap-1 hover:text-foreground" onClick={loadComments}>
            <MessageCircle className="h-4 w-4" />
            {post.commentCount}
          </button>
        </div>

        {showComments && (
          <div className="flex flex-col gap-3 border-t pt-3">
            {comments?.map((c) => (
              <div key={c.id} className="flex items-start justify-between gap-2 text-sm">
                <p>
                  <span className="font-medium">{c.authorName}:</span> {c.content}
                </p>
                {(isStaff || c.authorId === currentUserId) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={pending}
                    onClick={() => run(() => deleteCommentAction(c.id))}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
            <CommentComposer postId={post.id} onDone={() => { setComments(null); setShowComments(false); router.refresh(); }} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CommentComposer({ postId, onDone }: { postId: string; onDone: () => void }) {
  const action = commentOnPostAction.bind(null, postId);
  const [state, formAction] = useActionState<CommunityState, FormData>(action, null);

  useEffect(() => {
    if (state?.ok) onDone();
    else if (state?.error) toast.error(state.error);
  }, [state, onDone]);

  return (
    <form action={formAction} className="flex gap-2">
      <Input name="content" placeholder="Comentar..." required />
      <Button type="submit" size="sm">Enviar</Button>
    </form>
  );
}
