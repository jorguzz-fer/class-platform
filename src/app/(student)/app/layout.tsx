import Link from "next/link";
import { GraduationCap, BookOpen, Award, User } from "lucide-react";

import { requireOrg } from "@/lib/tenant";
import { logoutAction } from "@/lib/actions/auth-actions";
import { Button } from "@/components/ui/button";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireOrg();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-card">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/app" className="flex items-center gap-2 font-semibold">
            <GraduationCap className="h-6 w-6" />
            <span>Meus cursos</span>
          </Link>
          <nav className="flex items-center gap-1">
            <Link
              href="/app"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Cursos</span>
            </Link>
            <Link
              href="/app/certificates"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <Award className="h-4 w-4" />
              <span className="hidden sm:inline">Certificados</span>
            </Link>
            <span className="ml-2 flex items-center gap-2 text-sm">
              <User className="h-4 w-4" />
              <span className="hidden md:inline">{ctx.name}</span>
            </span>
            <form action={logoutAction}>
              <Button variant="ghost" size="sm" type="submit">
                Sair
              </Button>
            </form>
          </nav>
        </div>
      </header>
      <main className="container flex-1 py-8">{children}</main>
    </div>
  );
}
