"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, ExternalLink } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Versão compacta do link de inscrição, para caber numa célula da tabela de
 * cursos. Quando o curso ainda não é compartilhável (não publicado / sem
 * subdomínio), mostra uma dica curta em vez de um link quebrado.
 */
export function ShareCourseLinkCompact({
  subdomain,
  courseSlug,
  shareable,
}: {
  subdomain: string | null;
  courseSlug: string;
  shareable: boolean;
}) {
  const path = `/s/${subdomain ?? ""}/courses/${courseSlug}`;
  const [absoluteUrl, setAbsoluteUrl] = useState(path);
  useEffect(() => {
    setAbsoluteUrl(`${window.location.origin}${path}`);
  }, [path]);

  if (!subdomain) {
    return (
      <span className="text-xs text-muted-foreground">
        Defina o endereço da escola
      </span>
    );
  }

  if (!shareable) {
    return (
      <span className="text-xs text-muted-foreground">
        Publique para gerar o link
      </span>
    );
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(absoluteUrl);
      toast.success("Link copiado!");
    } catch {
      toast.error("Não foi possível copiar. Abra a página do curso.");
    }
  }

  return (
    <div className="flex items-center gap-1">
      <Button variant="outline" size="sm" onClick={copy} className="h-8 gap-1">
        <Copy className="h-3.5 w-3.5" />
        Copiar link
      </Button>
      <a
        href={path}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Abrir página pública do curso"
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "h-8 px-2",
        )}
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}
