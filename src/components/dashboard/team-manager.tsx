"use client";

import { useActionState, useEffect, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { UserRole } from "@prisma/client";

import {
  inviteTeamMemberAction,
  removeTeamMemberAction,
  type SettingsState,
} from "@/lib/actions/school-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ROLE_LABEL: Record<string, string> = {
  ORG_OWNER: "Dono",
  ORG_ADMIN: "Administrador",
  INSTRUCTOR: "Instrutor",
  SUPPORT: "Suporte",
};

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

type Member = {
  id: string;
  role: UserRole;
  user: { id: string; name: string; email: string; isActive: boolean };
};

function InviteButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Adicionando..." : "Adicionar"}
    </Button>
  );
}

export function TeamManager({ members }: { members: Member[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [state, formAction] = useActionState<SettingsState, FormData>(
    inviteTeamMemberAction,
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      toast.success("Membro adicionado.");
      router.refresh();
    } else if (state?.error) {
      toast.error(state.error);
    }
  }, [state, router]);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Adicionar membro</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" name="name" required />
              {state?.fieldErrors?.name && (
                <p className="text-sm text-destructive">{state.fieldErrors.name[0]}</p>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" required />
              {state?.fieldErrors?.email && (
                <p className="text-sm text-destructive">{state.fieldErrors.email[0]}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="role">Papel</Label>
              <select id="role" name="role" className={selectClass} defaultValue="INSTRUCTOR">
                <option value="ORG_ADMIN">Administrador</option>
                <option value="INSTRUCTOR">Instrutor</option>
                <option value="SUPPORT">Suporte</option>
              </select>
            </div>
            <InviteButton />
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Equipe</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">E-mail</th>
                <th className="px-4 py-3 font-medium">Papel</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b last:border-0">
                  <td className="px-4 py-3">{m.user.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{m.user.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant={m.role === "ORG_OWNER" ? "default" : "secondary"}>
                      {ROLE_LABEL[m.role] ?? m.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {m.role !== "ORG_OWNER" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={pending}
                        onClick={() => {
                          if (!confirm(`Remover ${m.user.name} da equipe?`)) return;
                          startTransition(async () => {
                            const result = await removeTeamMemberAction(m.id);
                            if (result?.error) toast.error(result.error);
                            else {
                              toast.success("Membro removido.");
                              router.refresh();
                            }
                          });
                        }}
                      >
                        Remover
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
