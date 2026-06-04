import { listAllUsers } from "@/services/admin.service";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function AdminUsersPage() {
  const users = await listAllUsers();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Usuários</h1>
        <p className="text-muted-foreground">Últimos usuários da plataforma.</p>
      </div>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">E-mail</th>
                <th className="px-4 py-3 font-medium">Papel</th>
                <th className="px-4 py-3 font-medium">Ativo</th>
                <th className="px-4 py-3 font-medium">Criado em</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{u.role}</Badge>
                  </td>
                  <td className="px-4 py-3">{u.isActive ? "sim" : "não"}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {u.createdAt.toLocaleDateString("pt-BR")}
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
