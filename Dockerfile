# ---- Base ----
# Imagem Node 22 (alinhada ao ambiente de desenvolvimento). Alpine = enxuta.
FROM node:22-alpine AS base
# libc6-compat ajuda binários (ex.: engine do Prisma) em Alpine.
RUN apk add --no-cache libc6-compat
RUN corepack enable
WORKDIR /app

# ---- Dependências ----
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile

# ---- Build ----
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Gera o Prisma Client e builda o Next (output: standalone).
RUN pnpm build

# ---- Runtime ----
FROM base AS runner
ENV NODE_ENV=production
# Usuário não-root (boa prática de segurança).
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Artefatos do build standalone do Next.
# IMPORTANTE: o standalone do Next JÁ inclui o Prisma Client gerado + o engine
# (libquery_engine) — o app funciona sem copiar .prisma manualmente (e com pnpm
# o client nem fica em node_modules/.prisma na raiz, e sim sob .pnpm).
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

# `public/` é opcional no Next; criamos vazio para servir assets previsivelmente.
RUN mkdir -p ./public

# Schema + migrations + seed (.mjs) para rodar `migrate deploy` / seed no deploy.
COPY --from=build /app/prisma ./prisma

# CLI do Prisma + bcryptjs para o seed/migrations. O standalone traz só o Client
# (runtime do app); a CLI do Prisma não, e o bcryptjs é inlinado nos chunks do
# Next (some do node_modules). Instalamos ambos globalmente na versão exata.
# A CLI baixa o engine certo para Alpine/musl; bcryptjs garante o seed.
RUN npm install -g prisma@6.19.3 bcryptjs@2.4.3

COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh && chown -R nextjs:nodejs /app

USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0

# Por padrão sobe só o servidor (sem migrar) — seguro para múltiplas réplicas.
# Para aplicar migrations, rode um job/one-shot com RUN_MIGRATIONS=true (ver
# docker-entrypoint.sh e DEPLOY.md).
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
