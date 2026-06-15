#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/apps/api"

echo "==> Running database migrations"
npx prisma migrate deploy

echo "==> Starting API"
exec node dist/index.js
