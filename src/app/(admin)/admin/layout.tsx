import Link from "next/link";
import { ShieldCheck, Building2, CreditCard, Users, BarChart3, ScrollText } from "lucide-react";

import { requireSuperAdmin } from "@/lib/tenant";
import { logoutAction } from "@/lib/actions/auth-actions";
import { Button } from "@/components/ui/button";

// Painel da plataforma: sempre dinâmico (depende de sessão/banco).
export const dynamic = "force-dynamic";

const nav = [
  { href: "/admin", label: "Métricas", icon: BarChart3 },
  { href: "/admin/organizations", label: "Organizações", icon: Building2 },
  { href: "/admin/plans", label: "Planos", icon: CreditCard },
  { href: "/admin/users", label: "Usuários", icon: Users },
  { href: "/admin/logs", label: "Logs", icon: ScrollText },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireSuperAdmin();

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 border-r bg-card md:flex md:flex-col">
        <div className="flex h-16 items-center gap-2 border-b px-6 font-semibold">
          <ShieldCheck className="h-6 w-6" />
          <span>Super Admin</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b bg-card px-6">
          <div className="md:hidden font-semibold">Super Admin</div>
          <div className="ml-auto flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{ctx.email}</span>
            <form action={logoutAction}>
              <Button variant="ghost" size="sm" type="submit">
                Sair
              </Button>
            </form>
          </div>
        </header>
        <main className="flex-1 bg-muted/30 p-6">{children}</main>
      </div>
    </div>
  );
}
