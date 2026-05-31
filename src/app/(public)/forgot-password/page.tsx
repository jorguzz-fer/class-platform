import Link from "next/link";
import { GraduationCap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Etapa 1: apenas a estrutura da tela. O envio de e-mail e o fluxo de
// reset (PasswordResetToken) são implementados na Etapa 2.
export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-6 flex items-center justify-center gap-2 font-semibold"
        >
          <GraduationCap className="h-6 w-6" />
          <span>ClassOS</span>
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>Recuperar senha</CardTitle>
            <CardDescription>
              Em breve você poderá redefinir sua senha por e-mail.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" name="email" type="email" disabled />
              </div>
              <Button className="w-full" disabled>
                Enviar link (em breve)
              </Button>
              <Link
                href="/login"
                className="text-center text-sm text-muted-foreground hover:underline"
              >
                Voltar ao login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
