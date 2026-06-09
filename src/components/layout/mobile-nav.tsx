"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, GraduationCap } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { dashboardNav } from "@/components/layout/nav-items";

/**
 * Menu de navegação do painel para telas pequenas (drawer). A sidebar fica
 * oculta em mobile (`md:hidden`), então este botão abre um painel deslizante
 * com os mesmos itens. Fecha ao navegar, clicar no fundo ou apertar Esc.
 */
export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Fecha ao trocar de rota.
  useEffect(() => setOpen(false), [pathname]);

  // Esc fecha; trava o scroll do body enquanto aberto.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Abrir menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          {/* Fundo escurecido */}
          <button
            aria-label="Fechar menu"
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          {/* Painel deslizante */}
          <div className="absolute left-0 top-0 flex h-full w-72 max-w-[80%] flex-col border-r bg-card shadow-xl">
            <div className="flex h-16 items-center justify-between border-b px-4 font-semibold">
              <span className="flex items-center gap-2">
                <GraduationCap className="h-6 w-6" />
                ClassOS
              </span>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Fechar menu"
                onClick={() => setOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
              {dashboardNav.map((item) => {
                const active =
                  item.href === "/dashboard"
                    ? pathname === item.href
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
