#!/bin/sh
set -e

# Migrations só rodam quando explicitamente solicitado (RUN_MIGRATIONS=true).
# Isso evita corrida/crash-loop quando há múltiplas réplicas: rode um job
# one-shot com RUN_MIGRATIONS=true ANTES de escalar o serviço (ver DEPLOY.md).
# Usa a CLI do Prisma instalada globalmente (npm install -g prisma).
if [ "$RUN_MIGRATIONS" = "true" ]; then
  echo "[entrypoint] Aplicando migrations (prisma migrate deploy)..."
  prisma migrate deploy
fi

echo "[entrypoint] Iniciando servidor..."
exec "$@"
