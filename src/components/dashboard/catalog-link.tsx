"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, ExternalLink } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Atalho para a página pública (catálogo "Netflix") da escola, exibido no topo
 * da tela de Cursos: copiar o link e abrir. Sem subdomínio definido, orienta
 * onde configurar em vez de mostrar um link quebrado.
 */
export function CatalogLink({ subdomain }: { subdomain: string | null }) {
  const path = `/s/${subdomain ?? ""}`;
  const [absoluteUrl, setAbsoluteUrl] = useState(path);
  useEffect(() => {
    setAbsoluteUrl(`${window.location.origin}${path}`);
  }, [path]);

  if (!subdomain) {
    return (
      <p className="text-sm text-muted-foreground">
        Defina o endereço da escola em{" "}
        <Link href="/dashboard/settings" className="font-medium text-primary hover:underline">
          Configurações → Domínio
        </Link>{" "}
        para ativar sua página pública.
      </p>
    );
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(absoluteUrl);
      toast.success("Link do catálogo copiado!");
    } catch {
      toast.error("Não foi possível copiar. Abra a página pública e copie a URL.");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" onClick={copy} className="gap-1">
        <Copy className="h-4 w-4" />
        Copiar link do catálogo
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
  );
}
