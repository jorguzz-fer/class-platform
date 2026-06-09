"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Provider de tema (claro/escuro) baseado em classe no <html>. As variáveis CSS
 * de cada tema já estão em globals.css (:root e .dark). `defaultTheme="system"`
 * respeita a preferência do sistema; o usuário pode alternar pelo ModeToggle.
 */
export function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
