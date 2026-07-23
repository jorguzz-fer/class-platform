"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Copy, ExternalLink } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Versão compacta do link de inscrição, para caber numa célula da tabela de
 * cursos. Quando o curso ainda não é compartilhável, mostra a razão exata
 * (sem subdomínio / não publicado / privado) em vez de um link quebrado.
 */
export function ShareCourseLinkCompact({
  subdomain,
  courseId,
  courseSlug,
  status,
  visibility,
}: {
  subdomain: string | null;
  courseId: string;
  courseSlug: string;
  status: string;
  visibility: string;
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

  if (status !== "PUBLISHED") {
    return (
      <span className="text-xs text-muted-foreground">
        Publique para gerar o link
      </span>
    );
  }

  // Publicado, mas privado: não entra no catálogo nem gera link de inscrição.
  if (visibility !== "PUBLIC" && visibility !== "UNLISTED") {
    return (
      <Link
        href={`/dashboard/courses/${courseId}`}
        className="text-xs text-muted-foreground hover:text-foreground hover:underline"
      >
        Curso privado — defina visibilidade Pública
      </Link>
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
