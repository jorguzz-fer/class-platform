import { LogOut } from "lucide-react";

import { logoutAction } from "@/lib/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import { MobileNav } from "@/components/layout/mobile-nav";

export function Topbar({ name, email }: { name: string; email: string }) {
  return (
    <header className="flex h-16 items-center justify-between gap-2 border-b bg-card px-4 sm:px-6">
      <div className="flex items-center gap-2">
        <MobileNav />
        <span className="font-semibold md:hidden">ClassOS</span>
      </div>
      <div className="ml-auto flex items-center gap-2 sm:gap-4">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium leading-none">{name}</p>
          <p className="text-xs text-muted-foreground">{email}</p>
        </div>
        <ModeToggle />
        <form action={logoutAction}>
          <Button variant="ghost" size="icon" type="submit" title="Sair">
            <LogOut className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </header>
  );
}
