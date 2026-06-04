import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Middleware de proteção de rotas. A lógica de quais rotas exigem login
// está no callback `authorized` de authConfig (edge-safe).
export default NextAuth(authConfig).auth;

export const config = {
  // Roda em tudo, exceto assets estáticos e as rotas internas do NextAuth.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
