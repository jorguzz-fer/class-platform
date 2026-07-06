import type { NextConfig } from "next";

// Content-Security-Policy — segunda camada de defesa contra XSS.
// Observações:
// - Next.js precisa de 'unsafe-inline'/'unsafe-eval' em script-src (hydration,
//   HMR em dev). Endurecer com nonces exige middleware — fora de escopo aqui.
// - img-src inclui o domínio público do R2 (thumbnails/uploads), se configurado.
// - IA (OpenAI/Anthropic) roda no servidor: o cliente não faz connect direto,
//   por isso connect-src fica em 'self'.
const r2Public = process.env.R2_PUBLIC_URL?.replace(/\/$/, "") ?? "";
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob:${r2Public ? ` ${r2Public}` : ""}`,
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
]
  .join("; ");

// Cabeçalhos de segurança aplicados a todas as respostas.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false, // não expõe "X-Powered-By: Next.js"
  // Build standalone: gera .next/standalone com server.js + deps mínimas,
  // ideal para imagem Docker enxuta (deploy via Coolify).
  output: "standalone",
  // Libs de extração de texto (.docx/.pdf) só rodam no servidor; mantê-las
  // externas evita problemas de bundling (pdfjs/worker) no build.
  // pdf-parse usa pdfjs, que precisa de @napi-rs/canvas (polyfill de DOMMatrix
  // etc.) para ler PDFs no servidor. Mantê-los externos preserva os binários
  // nativos no build standalone.
  serverExternalPackages: ["mammoth", "pdf-parse", "@napi-rs/canvas"],
  experimental: {
    // Permite enviar documentos (PDF/DOCX) maiores que o padrão de 1 MB nas
    // Server Actions (ex.: gerar curso/quiz a partir de arquivo).
    serverActions: { bodySizeLimit: "12mb" },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
