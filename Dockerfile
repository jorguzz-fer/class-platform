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

# Artefatos do build standalone do Next (já incluem o node_modules traçado).
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

# Prisma: schema + migrations + Client GERADO + CLI/engines.
# O Client gerado vive em node_modules/.prisma/client — ESSENCIAL copiar, senão
# o runtime falha com "Prisma Client did not initialize". Copiamos os pacotes do
# Prisma por cima do node_modules do standalone (complementa, não substitui).
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/node_modules/prisma ./node_modules/prisma

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
