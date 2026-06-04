import Link from "next/link";
import { Plus, BookOpen } from "lucide-react";

import { requireOrg } from "@/lib/tenant";
import { listCourses } from "@/services/course.service";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CourseStatusBadge } from "@/components/dashboard/course-status-badge";
import { cn } from "@/lib/utils";

export default async function CoursesPage() {
  const { organizationId } = await requireOrg();
  const courses = await listCourses(organizationId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cursos</h1>
          <p className="text-muted-foreground">
            Gerencie os cursos da sua escola.
          </p>
        </div>
        <Link
          href="/dashboard/courses/new"
          className={cn(buttonVariants(), "gap-2")}
        >
          <Plus className="h-4 w-4" />
          Novo curso
        </Link>
      </div>

      {courses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">Nenhum curso ainda</p>
            <p className="text-sm text-muted-foreground">
              Crie seu primeiro curso para começar.
            </p>
            <Link
              href="/dashboard/courses/new"
              className={cn(buttonVariants(), "mt-2 gap-2")}
            >
              <Plus className="h-4 w-4" />
              Novo curso
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Título</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Módulos</th>
                  <th className="px-4 py-3 font-medium">Aulas</th>
                  <th className="px-4 py-3 font-medium">Matrículas</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course) => (
                  <tr
                    key={course.id}
                    className="border-b last:border-0 hover:bg-muted/40"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/courses/${course.id}`}
                        className="font-medium hover:underline"
                      >
                        {course.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <CourseStatusBadge status={course.status} />
                    </td>
                    <td className="px-4 py-3">{course._count.modules}</td>
                    <td className="px-4 py-3">{course._count.lessons}</td>
                    <td className="px-4 py-3">{course._count.enrollments}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
