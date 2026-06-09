import Link from "next/link";
import { GraduationCap } from "lucide-react";

import { RegisterForm } from "@/components/forms/register-form";
import { CornerModeToggle } from "@/components/public/corner-mode-toggle";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <CornerModeToggle />
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
            <CardTitle>Criar sua escola</CardTitle>
            <CardDescription>
              Comece grátis com 14 dias de teste.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RegisterForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
