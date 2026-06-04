"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Award } from "lucide-react";

import { Button } from "@/components/ui/button";
import { issueCertificateAction } from "@/lib/actions/certificate-actions";

export function IssueCertificateButton({ courseId }: { courseId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      disabled={pending}
      className="gap-2"
      onClick={() =>
        startTransition(async () => {
          // Em caso de sucesso a action redireciona; só tratamos erro.
          const result = await issueCertificateAction(courseId);
          if (result?.error) toast.error(result.error);
        })
      }
    >
      <Award className="h-4 w-4" />
      {pending ? "Emitindo..." : "Emitir certificado"}
    </Button>
  );
}
