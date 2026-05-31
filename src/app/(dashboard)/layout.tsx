import { requireOrg } from "@/lib/tenant";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Exige sessão + organização. O middleware já protege /dashboard;
  // este guard garante o contexto de tenant no server.
  const ctx = await requireOrg();

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
