import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { logoutAction } from "@/lib/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function SuspendedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <p className="text-lg font-semibold">Acesso suspenso</p>
          <p className="text-sm text-muted-foreground">
            O acesso a esta escola está suspenso. Entre em contato com o suporte
            para regularizar a situação.
          </p>
          <form action={logoutAction}>
            <Button variant="outline" type="submit">
              Sair
            </Button>
          </form>
          <Link href="/" className="text-sm text-muted-foreground hover:underline">
            Voltar ao início
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
