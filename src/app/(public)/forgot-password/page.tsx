import Link from "next/link";
import { GraduationCap } from "lucide-react";

import { ForgotPasswordForm } from "@/components/forms/forgot-password-form";
import { CornerModeToggle } from "@/components/public/corner-mode-toggle";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ForgotPasswordPage() {
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
            <CardTitle>Recuperar senha</CardTitle>
            <CardDescription>
              Informe seu e-mail para receber o link de redefinição.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ForgotPasswordForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
