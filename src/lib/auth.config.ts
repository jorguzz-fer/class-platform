import type { NextAuthConfig } from "next-auth";
import type { UserRole } from "@prisma/client";

/**
 * Configuração base do Auth.js (edge-safe).
 * NÃO importar Prisma, bcrypt ou qualquer coisa de runtime Node aqui —
 * este arquivo também é usado pelo middleware (Edge Runtime).
 * Os providers (Credentials) são adicionados em `auth.ts`.
 */
export const authConfig = {
  // Confia no header Host repassado pelo proxy reverso (Coolify/Traefik, Nginx).
  // Sem isso, o Auth.js v5 em produção atrás de proxy rejeita o fluxo de login
  // (origem/host não confiável) — causa comum de "credencial válida mas não loga".
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    // Sessão de painel administrativo: 8h em vez do default de 30 dias do
    // Auth.js — reduz a janela de um token roubado. `updateAge` re-emite o JWT
    // a cada hora de atividade, mantendo o usuário logado enquanto usa.
    maxAge: 8 * 60 * 60,
    updateAge: 60 * 60,
  },
  callbacks: {
    // Protege rotas no middleware. Retornar false redireciona para signIn.
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const path = nextUrl.pathname;
      const isProtected =
        path.startsWith("/dashboard") ||
        path.startsWith("/admin") ||
        path.startsWith("/app") ||
        path.startsWith("/checkout");
      if (isProtected) return isLoggedIn;
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
        token.organizationId = user.organizationId;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.organizationId =
          (token.organizationId as string | null) ?? null;
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
