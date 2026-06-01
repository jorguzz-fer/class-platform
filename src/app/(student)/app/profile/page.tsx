import { Download } from "lucide-react";

import { requireOrg } from "@/lib/tenant";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "@/components/forms/profile-form";

export default async function StudentProfilePage() {
  const ctx = await requireOrg();
  const user = await db.user.findUnique({
    where: { id: ctx.userId },
    select: { name: true, email: true, avatarUrl: true },
  });

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">Meu perfil</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados da conta</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm
            defaults={{ name: user?.name ?? ctx.name, avatarUrl: user?.avatarUrl ?? null }}
            email={user?.email ?? ctx.email}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Privacidade (LGPD)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Você pode baixar uma cópia de todos os seus dados pessoais.
          </p>
          <a
            href="/api/me/export"
            className="inline-flex h-9 w-fit items-center gap-2 rounded-md border bg-background px-4 text-sm font-medium hover:bg-accent"
          >
            <Download className="h-4 w-4" />
            Exportar meus dados
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
