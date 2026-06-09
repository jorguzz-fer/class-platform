import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { requireOrg } from "@/lib/tenant";
import { can } from "@/lib/permissions";
import { getStudent } from "@/services/student.service";
import { listEnrollmentsForStudent } from "@/services/enrollment.service";
import { listEnrollableCourses } from "@/services/course.service";
import { EnrollStudentForm } from "@/components/dashboard/enroll-student-form";
import { EnrollmentRowActions } from "@/components/dashboard/enrollment-row-actions";
import { EnrollmentStatusBadge } from "@/components/dashboard/enrollment-status-badge";
import { AnonymizeStudentButton } from "@/components/dashboard/anonymize-student-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  const ctx = await requireOrg();

  const student = await getStudent(ctx.organizationId, studentId);
  if (!student) notFound();

  const [enrollments, courses] = await Promise.all([
    listEnrollmentsForStudent(ctx.organizationId, studentId),
    listEnrollableCourses(ctx.organizationId),
  ]);

  const canManageEnroll = can(ctx.role, "enrollment:manage");
  const enrolledCourseIds = new Set(enrollments.map((e) => e.course.id));
  const available = courses.filter((c) => !enrolledCourseIds.has(c.id));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          href="/dashboard/students"
          className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">{student.name}</h1>
        <p className="text-muted-foreground">{student.email}</p>
      </div>

      {canManageEnroll && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Matricular em curso</CardTitle>
          </CardHeader>
          <CardContent>
            <EnrollStudentForm studentId={student.id} courses={available} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Matrículas</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {enrollments.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">
              Este aluno ainda não tem matrículas.
            </p>
          ) : (
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Curso</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {enrollments.map((e) => (
                  <tr key={e.id} className="border-b last:border-0">
                    <td className="px-4 py-3">{e.course.title}</td>
                    <td className="px-4 py-3">
                      <EnrollmentStatusBadge status={e.status} />
                    </td>
                    <td className="px-4 py-3">
                      {canManageEnroll && (
                        <EnrollmentRowActions
                          enrollmentId={e.id}
                          canCancel={e.status === "ACTIVE"}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {can(ctx.role, "student:manage") && (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base">Privacidade (LGPD)</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Anonimizar remove os dados pessoais do aluno (direito ao
              esquecimento), preservando o histórico de forma anônima.
            </p>
            <AnonymizeStudentButton studentId={student.id} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
