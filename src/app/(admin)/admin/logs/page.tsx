import { listAuditLogs } from "@/services/admin.service";
import { Card, CardContent } from "@/components/ui/card";

export default async function AdminLogsPage() {
  const logs = await listAuditLogs();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Logs administrativos</h1>
        <p className="text-muted-foreground">Ações auditadas na plataforma.</p>
      </div>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Ação</th>
                <th className="px-4 py-3 font-medium">Entidade</th>
                <th className="px-4 py-3 font-medium">Por</th>
                <th className="px-4 py-3 font-medium">Quando</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-mono text-xs">{log.action}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {log.entityType ?? "—"}
                    {log.entityId ? ` (${log.entityId.slice(0, 8)})` : ""}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {log.user?.email ?? "sistema"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {log.createdAt.toLocaleString("pt-BR")}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhum log ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
