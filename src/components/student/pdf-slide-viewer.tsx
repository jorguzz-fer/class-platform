"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, FileText } from "lucide-react";
import type {
  PDFDocumentProxy,
  PDFDocumentLoadingTask,
  RenderTask,
} from "pdfjs-dist";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Passador de slides para aulas do tipo PDF. Renderiza uma lâmina por vez num
 * canvas (via PDF.js), com navegação por botões e setas do teclado. O PDF.js é
 * importado dinamicamente (só no cliente) e o worker vem da CDN, casando com a
 * versão instalada.
 */
export function PdfSlideViewer({ url }: { url: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const docRef = useRef<PDFDocumentProxy | null>(null);
  const loadingTaskRef = useRef<PDFDocumentLoadingTask | null>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);

  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Carrega o documento (uma vez por URL).
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
        const loadingTask = pdfjs.getDocument({ url });
        loadingTaskRef.current = loadingTask;
        const doc = await loadingTask.promise;
        if (cancelled) {
          loadingTask.destroy();
          return;
        }
        docRef.current = doc;
        setNumPages(doc.numPages);
        setPage(1);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
      loadingTaskRef.current?.destroy();
      docRef.current = null;
    };
  }, [url]);

  // Renderiza a lâmina atual sempre que muda a página (ou o doc carrega).
  useEffect(() => {
    const doc = docRef.current;
    const canvas = canvasRef.current;
    if (!doc || !canvas || numPages === 0) return;

    let cancelled = false;
    (async () => {
      const pageProxy = await doc.getPage(page);
      if (cancelled) return;

      const containerWidth = canvas.parentElement?.clientWidth ?? 800;
      const base = pageProxy.getViewport({ scale: 1 });
      // Limita a 2x para nitidez sem estourar memória.
      const scale = Math.min(2, Math.max(0.5, containerWidth / base.width));
      const viewport = pageProxy.getViewport({ scale });

      const context = canvas.getContext("2d");
      if (!context) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      renderTaskRef.current?.cancel();
      const task = pageProxy.render({ canvasContext: context, viewport, canvas });
      renderTaskRef.current = task;
      try {
        await task.promise;
      } catch {
        // render cancelado (troca rápida de página) — ignora.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [page, numPages]);

  const go = useCallback(
    (dir: -1 | 1) => {
      setPage((p) => Math.min(numPages, Math.max(1, p + dir)));
    },
    [numPages],
  );

  // Navegação por teclado (setas).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
          <FileText className="h-8 w-8" />
          <p>Não foi possível carregar os slides.</p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline"
          >
            Abrir o PDF
          </a>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-3 sm:p-4">
        <div className="relative flex min-h-[300px] items-center justify-center overflow-hidden rounded-md bg-muted/40">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          <canvas ref={canvasRef} className="max-w-full" />
        </div>

        <div className="flex items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => go(-1)}
            disabled={loading || page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            {numPages > 0 ? `Slide ${page} de ${numPages}` : "Carregando…"}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => go(1)}
            disabled={loading || page >= numPages}
          >
            Próximo
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
