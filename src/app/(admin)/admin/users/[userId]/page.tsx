import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { requireSuperAdmin } from "@/lib/tenant";
import { getUserForAdmin } from "@/services/admin.service";
import { updateUserAction } from "@/lib/actions/admin-actions";
import { AdminUserForm } from "@/components/admin/admin-user-form";
import { Card, CardContent } from "@/components/ui/card";

export default async function AdminEditUserPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  await requireSuperAdmin();
  const { userId } = await params;

  const user = await getUserForAdmin(userId);
  if (!user) notFound();

  // updateUserAction precisa do userId; bind via closure no server.
  const boundUpdate = updateUserAction.bind(null, user.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          href="/admin/users"
          className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar aos usuários
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Editar usuário</h1>
      </div>

      <Card>
        <CardContent className="py-6">
          <AdminUserForm
            action={boundUpdate}
            defaults={{
              name: user.name,
              email: user.email,
              role: user.role,
              isActive: user.isActive,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
