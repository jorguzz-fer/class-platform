import { requireStaff } from "@/lib/tenant";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

// Painel administrativo: sempre dinâmico (depende de sessão/banco). Evita que o
// Next tente pré-renderizar no build (que erra por não ter banco/sessão).
export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Exige membro da EQUIPE (não-aluno) + organização ativa. O middleware protege
  // /dashboard (exige login); este guard impede que um STUDENT acesse o painel
  // administrativo e bloqueia org suspensa (§11.1).
  const ctx = await requireStaff();

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Topbar name={ctx.name} email={ctx.email} />
        <main className="flex-1 bg-muted/30 p-6">{children}</main>
      </div>
    </div>
  );
}
