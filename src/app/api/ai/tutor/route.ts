import { NextResponse } from "next/server";
import { z } from "zod";

import { getTenantContext } from "@/lib/tenant";
import { db } from "@/lib/db";
import { getAIProvider } from "@/lib/ai";
import { getOrgPlan } from "@/services/school.service";

const bodySchema = z.object({
  courseId: z.string().min(1),
  lessonId: z.string().optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(20),
});

/**
 * Tutor do aluno (chat) — resposta em streaming (text/plain).
 * Escopo: o usuário deve estar matriculado no curso e o plano deve liberar IA.
 */
export async function POST(req: Request) {
  const ctx = await getTenantContext();
  if (!ctx?.organizationId) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }
  const { courseId, lessonId, messages } = parsed.data;

  const plan = await getOrgPlan(ctx.organizationId);
  if (!plan?.hasAiFeatures) {
    return NextResponse.json(
      { error: "Recursos de IA não disponíveis no plano." },
      { status: 403 },
    );
  }

  // Acesso: matrícula ativa/concluída no curso (isolamento por tenant via org do curso).
  const enrollment = await db.enrollment.findFirst({
    where: {
      studentId: ctx.userId,
      courseId,
      organizationId: ctx.organizationId,
      status: { in: ["ACTIVE", "COMPLETED"] },
    },
    select: { course: { select: { title: true } } },
  });
  if (!enrollment) {
    return NextResponse.json({ error: "Sem acesso a este curso." }, { status: 403 });
  }

  let lessonTitle: string | undefined;
  let lessonContent: string | undefined;
  if (lessonId) {
    const lesson = await db.lesson.findFirst({
      where: { id: lessonId, courseId, organizationId: ctx.organizationId },
      select: { title: true, textContent: true, description: true },
    });
    if (lesson) {
      lessonTitle = lesson.title;
      lessonContent = lesson.textContent ?? lesson.description ?? undefined;
    }
  }

  const provider = getAIProvider();
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of provider.tutorReply(
          { courseTitle: enrollment.course.title, lessonTitle, lessonContent },
          messages,
        )) {
          controller.enqueue(encoder.encode(chunk));
        }
      } catch {
        controller.enqueue(encoder.encode("\n[Erro ao gerar resposta.]"));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
