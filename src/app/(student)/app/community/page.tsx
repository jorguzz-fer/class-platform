import { requireOrg } from "@/lib/tenant";
import { isStaff } from "@/lib/permissions";
import { listFeed } from "@/services/community.service";
import { listStudentCourses } from "@/services/progress.service";
import { listEnrollableCourses } from "@/services/course.service";
import { CommunityFeed } from "@/components/student/community-feed";

export default async function CommunityPage() {
  const ctx = await requireOrg();
  const staff = isStaff(ctx.role);

  const posts = await listFeed(ctx.organizationId, { id: ctx.userId, role: ctx.role });

  // Cursos onde o usuário pode postar: matriculados (aluno) ou todos (staff).
  const courses = staff
    ? await listEnrollableCourses(ctx.organizationId)
    : (await listStudentCourses(ctx.userId)).map((c) => ({
        id: c.course.id,
        title: c.course.title,
      }));

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Comunidade</h1>
        <p className="text-muted-foreground">Converse com colegas e instrutores.</p>
      </div>

      <CommunityFeed
        posts={posts.map((p) => ({
          id: p.id,
          content: p.content,
          authorName: p.author.name,
          authorId: p.author.id,
          courseTitle: p.course?.title ?? null,
          isPinned: p.isPinned,
          likeCount: p._count.likes,
          commentCount: p._count.comments,
          likedByMe: p.likes.length > 0,
          createdAt: p.createdAt.toISOString(),
        }))}
        courses={courses}
        currentUserId={ctx.userId}
        isStaff={staff}
      />
    </div>
  );
}
