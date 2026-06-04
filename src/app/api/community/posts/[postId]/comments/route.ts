import { NextResponse } from "next/server";

import { getTenantContext } from "@/lib/tenant";
import { listPostComments } from "@/services/community.service";
import { db } from "@/lib/db";

/** Lista comentários de um post (escopado por org do usuário logado). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ postId: string }> },
) {
  const { postId } = await params;
  const ctx = await getTenantContext();
  if (!ctx?.organizationId) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  // Confirma que o post pertence à org do usuário.
  const post = await db.post.findFirst({
    where: { id: postId, organizationId: ctx.organizationId },
    select: { id: true },
  });
  if (!post) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  const comments = await listPostComments(ctx.organizationId, postId);
  return NextResponse.json(
    comments.map((c) => ({
      id: c.id,
      authorName: c.author.name,
      authorId: c.author.id,
      content: c.content,
    })),
  );
}
