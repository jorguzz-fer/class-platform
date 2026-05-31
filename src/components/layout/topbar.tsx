import { LogOut } from "lucide-react";

import { logoutAction } from "@/lib/actions/auth-actions";
import { Button } from "@/components/ui/button";

export function Topbar({ name, email }: { name: string; email: string }) {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div className="md:hidden font-semibold">ClassOS</div>
      <div className="ml-auto flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium leading-none">{name}</p>
          <p className="text-xs text-muted-foreground">{email}</p>
        </div>
        <form action={logoutAction}>
          <Button variant="ghost" size="icon" type="submit" title="Sair">
            <LogOut className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </header>
  );
}
