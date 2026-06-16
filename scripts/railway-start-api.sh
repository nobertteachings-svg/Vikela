#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/apps/api"

mark_all_migrations_applied() {
  for dir in prisma/migrations/*/; do
    [[ -d "$dir" ]] || continue
    local name
    name="$(basename "$dir")"
    npx prisma migrate resolve --applied "$name" 2>/dev/null || true
  done
}

bootstrap_schema() {
  echo "==> Bootstrapping database schema (db push + mark migrations applied)"
  npx prisma db push --skip-generate
  mark_all_migrations_applied
}

recover_failed_migration() {
  local log_file="$1"
  local failed=""
  failed="$(sed -n 's/.*The `\([^`]*\)` migration.*/\1/p' "$log_file" | head -1)"
  if [[ -z "$failed" ]]; then
    failed="20250522140000_production_features"
  fi
  echo "==> Recovering failed migration: $failed"
  npx prisma migrate resolve --rolled-back "$failed"
  bootstrap_schema
}

run_migrations() {
  local log
  log="$(mktemp)"
  if npx prisma migrate deploy 2>&1 | tee "$log"; then
    rm -f "$log"
    return 0
  fi

  if grep -q "P3009" "$log"; then
    echo "==> Detected failed migration (P3009)"
    recover_failed_migration "$log"
    rm -f "$log"
    npx prisma migrate deploy
    return 0
  fi

  if grep -q "P3005" "$log"; then
    echo "==> Detected missing migration baseline (P3005)"
    rm -f "$log"
    bootstrap_schema
    npx prisma migrate deploy
    return 0
  fi

  rm -f "$log"
  return 1
}

echo "==> Validating API environment"
bash "$ROOT/scripts/railway-validate-env.sh" api

echo "==> Running database migrations"
run_migrations

echo "==> Checking database seed"
bash "$ROOT/scripts/railway-seed-if-empty.sh"

echo "==> Starting API"
exec node dist/index.js
