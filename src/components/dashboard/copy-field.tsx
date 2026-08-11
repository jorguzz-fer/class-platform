"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, Check } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Campo somente leitura com botão de copiar (URLs, tokens). */
export function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Copiado!");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Não foi possível copiar. Selecione e copie manualmente.");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <code className="block w-full overflow-x-auto rounded bg-muted px-2 py-1.5 text-xs">
        {value}
      </code>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={copy}
        aria-label="Copiar"
        className="shrink-0"
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
}
