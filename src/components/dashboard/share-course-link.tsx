"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, ExternalLink } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Link de inscrição do curso para enviar ao aluno (página pública /s/...).
 * Só faz sentido quando o curso está publicado e visível (PUBLIC/UNLISTED) e a
 * escola tem um endereço (subdomain) configurado. Caso contrário, orienta o que
 * falta — sem expor um link quebrado.
 */
export function ShareCourseLink({
  subdomain,
  courseSlug,
  shareable,
  missing,
}: {
  subdomain: string | null;
  courseSlug: string;
  shareable: boolean;
  missing: string[];
}) {
  // origin só existe no cliente; monta a URL absoluta após montar.
  const path = `/s/${subdomain ?? ""}/courses/${courseSlug}`;
  const [absoluteUrl, setAbsoluteUrl] = useState(path);
  useEffect(() => {
    setAbsoluteUrl(`${window.location.origin}${path}`);
  }, [path]);

  if (!subdomain) {
    return (
      <p className="text-sm text-muted-foreground">
        Defina o endereço da escola em Configurações → Domínio para gerar o link
        de inscrição.
      </p>
    );
  }

  if (!shareable) {
    return (
      <p className="text-sm text-muted-foreground">
        Para gerar o link de inscrição: {missing.join(" e ")}.
      </p>
    );
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(absoluteUrl);
      toast.success("Link copiado!");
    } catch {
      toast.error("Não foi possível copiar. Copie manualmente o link exibido.");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">
        Envie este link para o aluno. Ele se cadastra e já começa o curso —
        você recebe um e-mail avisando.
      </p>
      <code className="block w-fit max-w-full overflow-x-auto rounded bg-muted px-2 py-1 text-xs">
        {absoluteUrl}
      </code>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={copy} className="gap-1">
          <Copy className="h-4 w-4" />
          Copiar link
        </Button>
        <a
          href={path}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1")}
        >
          <ExternalLink className="h-4 w-4" />
          Ver página pública
        </a>
      </div>
    </div>
  );
}
