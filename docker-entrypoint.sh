#!/bin/sh
set -e

# Migrations só rodam quando explicitamente solicitado (RUN_MIGRATIONS=true).
# Isso evita corrida/crash-loop quando há múltiplas réplicas: rode um job
# one-shot com RUN_MIGRATIONS=true ANTES de escalar o serviço (ver DEPLOY.md).
if [ "$RUN_MIGRATIONS" = "true" ]; then
  echo "[entrypoint] Aplicando migrations (prisma migrate deploy)..."
  node node_modules/prisma/build/index.js migrate deploy
fi

echo "[entrypoint] Iniciando servidor..."
exec "$@"
