import Link from "next/link";
import { notFound } from "next/navigation";

import { requireOrg } from "@/lib/tenant";
import { db } from "@/lib/db";
import { CheckoutForm } from "@/components/student/checkout-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatMoney(amount: unknown, currency: string) {
  const v = Number(amount ?? 0);
  if (v === 0) return "Gratuito";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(v);
}

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ courseSlug: string }>;
}) {
  const { courseSlug } = await params;
  const ctx = await requireOrg();

  const course = await db.course.findFirst({
    where: { slug: courseSlug, organizationId: ctx.organizationId, status: "PUBLISHED" },
    select: { id: true, title: true, subtitle: true, price: true, currency: true },
  });
  if (!course) notFound();

  // Já matriculado? Vai direto ao curso.
  const enrolled = await db.enrollment.findUnique({
    where: { courseId_studentId: { courseId: course.id, studentId: ctx.userId } },
    select: { id: true },
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{course.title}</CardTitle>
          {course.subtitle && (
            <p className="text-sm text-muted-foreground">{course.subtitle}</p>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="text-2xl font-bold">
            {formatMoney(course.price, course.currency)}
          </div>

          {enrolled ? (
            <Link
              href={`/app/courses/${courseSlug}`}
              className="text-sm text-primary hover:underline"
            >
              Você já tem acesso — ir para o curso
            </Link>
          ) : (
            <CheckoutForm courseId={course.id} />
          )}

          <Link href="/app" className="text-center text-xs text-muted-foreground hover:underline">
            Voltar
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
