# Security Audit — class-platform — 2026-07-06

Stack: Next.js 15.1.3 + Prisma 6 + Auth.js v5 (next-auth beta) + zod + pnpm (multi-tenant)
Playbooks: `vibesec`, `nextjs-prisma-multitenant-security`
Método: varredura por grep + leitura de código; 48 arquivos de actions/services e 8 rotas `/api/*` auditados individualmente por subagentes.

**Achados: 🔴 0 crítico · 🟠 1 alto · 🟡 3 médio · 🟢 4 baixo**

> Veredito geral: **app bem arquitetado em segurança.** Isolamento de tenant, RBAC, validação de webhook, auth de API e escopo por org/usuário estão corretos e consistentes. Nenhuma falha de autorização/IDOR/SQLi/mass assignment. Os itens abaixo são hardening — o único de peso real é a **ausência total de rate limiting**.

---

## O que já está CORRETO (não mexer)

- **Isolamento de tenant** — todo `update/delete/findUnique` por id é escopado por `organizationId` (padrão direto ou ownership-check-then-update). 48/48 arquivos limpos.
- **RBAC centralizado** (`permissions.ts`) — `assertPermission`/`can` aplicados antes de cada mutação administrativa.
- **Revalidação de sessão no banco** (`getTenantContext`) — acesso revogado/rebaixado tem efeito imediato, sem esperar o JWT expirar.
- **Reset de senha** — token SHA-256, 32 bytes, TTL 1h, uso único, invalida tokens anteriores, resposta genérica.
- **Login sem enumeração** — mesma resposta `null` para inexistente/inativo/sem senha; mensagem genérica no action.
- **Auth de API** (`api-auth.ts`) — token com hash SHA-256, checa revogação + status da org; `organizationId` vem da chave, nunca do body.
- **Webhook de pagamento** — HMAC-SHA256 com `timingSafeEqual` (guardado por check de tamanho), fail-closed 503 sem secret, assinatura verificada antes do parse.
- **Rota de automação (cron)** — exige `Authorization: Bearer <CRON_SECRET>`, fail-closed 503.
- **Upload** — valida **magic bytes** (não extensão/mime), cap de 20 MB, chave por org + UUID aleatório (sem path traversal / overwrite cross-tenant).
- **IA (`ai/tutor`, `ai/thumbnail`)** — sessão + gate de plano + checagem de matrícula escopada por org; sem SSRF (prompt server-side, fetch só na resposta do provider).
- **Sem SQL injection** — nenhuma raw query; Prisma parametrizado em todo lugar.
- **Infra** — Dockerfile non-root, sem secrets em `ARG`; `poweredByHeader: false`; `.env` não versionado.

---

## 🟠 Alto

### A1. Ausência total de rate limiting nos fluxos de autenticação
- **Onde:** `src/lib/auth.ts:17` (`authorize`), `src/lib/actions/auth-actions.ts:31` (`loginAction`), `:61` (`registerAction`), fluxo `forgot-password` → `src/services/password-reset.service.ts:31` (`requestPasswordReset`).
- **Evidência:** nenhuma referência a rate limit/throttle no projeto inteiro (`grep -rniE "ratelimit|throttle|upstash" src` → 0 hits). `authorize()` faz `bcrypt.compare` sem nenhum limite de tentativas.
- **Risco:** brute force e credential stuffing gratuitos contra o login; spam de e-mails de reset; amplificação da enumeração (B1). Agravado pela política de senha fraca (B2): senha de 8 chars sem complexidade + tentativas ilimitadas.
- **Correção:** aplicar o `src/lib/rateLimit.ts` do playbook `nextjs-prisma-multitenant-security` (§1, sliding window em Postgres) com chave dupla **IP + e-mail**:
  - login: `login:ip:<ip>` (10/15min) e `login:email:<email>` (10/1h)
  - reset/forgot: `reset:ip:<ip>` e `reset:email:<email>`
  - register: `register:ip:<ip>`
  Ver `vibesec` › Password Security / API Security.

---

## 🟡 Médio

### M1. Content-Security-Policy ausente
- **Onde:** `next.config.ts:4-17` (`securityHeaders`).
- **Evidência:** há HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` — mas **nenhuma** `Content-Security-Policy`.
- **Risco:** sem a segunda camada de defesa contra XSS; qualquer injeção de script roda sem restrição de origem.
- **Correção:** adicionar CSP ao array de headers — ver `nextjs-prisma-multitenant-security` §6 (bloco pronto com `frame-ancestors 'none'`, `object-src 'none'`, etc.). Ajustar `img-src`/`connect-src` para o domínio público do R2 e provider de IA. Ver `vibesec` › XSS › CSP.

### M2. Sessão JWT sem `maxAge` — cai no default de 30 dias
- **Onde:** `src/lib/auth.config.ts:18-20` (`session: { strategy: "jwt" }`).
- **Evidência:** `strategy: "jwt"` sem `maxAge` nem `updateAge` → Auth.js assume 30 dias.
- **Risco:** token roubado vale por 30 dias; janela longa demais para sessão de painel administrativo.
- **Correção:** `maxAge: 8 * 60 * 60` (8h) + `updateAge: 60 * 60`. Ver playbook §7 (checklist de hardening do NextAuth).

### M3. Rate limit ausente nos endpoints pagos de IA
- **Onde:** `src/app/api/ai/tutor/route.ts`, `src/app/api/ai/thumbnail/route.ts`.
- **Evidência:** ambos autenticados e com gate de plano, mas sem throttle por org/usuário.
- **Risco:** abuso de custo — um tenant legítimo (ou credencial vazada) pode disparar chamadas ilimitadas ao LLM/geração de imagem. Bounded a tenant autenticado, por isso Médio e não Alto.
- **Correção:** aplicar `rateLimit` com chave `ai:<orgId>` (ex.: N/min) nas duas rotas.

---

## 🟢 Baixo

### B1. Enumeração de usuário/escola no cadastro
- **Onde:** `src/lib/actions/auth-actions.ts:87-88`.
- **Evidência:** `"Este e-mail já está em uso."` / `"Este endereço de escola já existe."` — respostas distintas revelam existência.
- **Risco:** atacante mapeia e-mails cadastrados e slugs de escola. Trade-off comum de UX em cadastro; mitigável com rate limit (A1).
- **Correção:** aceitável manter por UX se A1 for aplicado; caso contrário, mensagem genérica + confirmação por e-mail. Ver `vibesec` › Access Control (enumeração).

### B2. Política de senha fraca
- **Onde:** `src/lib/validators.ts:18-21` (`passwordSchema`).
- **Evidência:** apenas `min(8).max(72)` — sem exigência de classes de caractere nem blocklist de senhas comuns.
- **Risco:** permite `12345678`, `password`, etc.; combinado com A1 (sem rate limit) facilita brute force.
- **Correção:** adotar `validatePassword` do playbook §1 (≥10 chars, ≥3 classes, blocklist). Ver `vibesec` › Password Security.

### B3. Upload aceita SVG
- **Onde:** `src/app/api/uploads/route.ts` (`detectType`, ~linha 40).
- **Evidência:** SVG na lista de tipos permitidos. SVG pode conter `<script>`.
- **Risco:** stored XSS **se** os arquivos forem algum dia servidos same-origin. Hoje vão para domínio público separado do R2 → risco baixo.
- **Correção:** sanitizar SVG (DOMPurify server-side) ou servir sempre com `Content-Disposition: attachment` + domínio isolado. Ver `vibesec` › Insecure File Upload.

### B4. Comparação do Bearer de cron não é constant-time
- **Onde:** `src/app/api/automations/recover-inactive/route.ts:28`.
- **Evidência:** `bearer !== \`Bearer ${CRON_SECRET}\`` — comparação `!==` comum.
- **Risco:** side-channel de timing teórico sobre um secret de alta entropia — desprezível na prática.
- **Correção:** opcional — `crypto.timingSafeEqual`. Baixíssima prioridade.

---

## Ordem sugerida de remediação

1. **A1** — rate limit nos fluxos de auth (maior ganho de segurança, arquivo `lib/rateLimit.ts` do playbook, ~1 dia).
2. **M2** — `maxAge`/`updateAge` da sessão (2 linhas).
3. **M1** — CSP (bloco pronto do playbook §6, testar em staging por causa de `unsafe-inline`).
4. **M3** — rate limit nas rotas de IA (reusa o de A1).
5. **B2** — política de senha (reusa `validatePassword` do playbook).
6. **B1 / B3 / B4** — conforme prioridade; B4 é opcional.

> Itens B1–B4 podem ser aceitos como risco residual sem drama. A1 é o único que eu trataria como "resolver esta semana".
