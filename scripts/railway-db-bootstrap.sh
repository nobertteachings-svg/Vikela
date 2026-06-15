#!/usr/bin/env bash
# One-time Railway Postgres bootstrap when migrate deploy is stuck (P3009/P3005).
# Run from repo root in Railway API service shell:
#   bash scripts/railway-db-bootstrap.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/apps/api"

FAILED="${1:-20250522140000_production_features}"

echo "==> Marking failed migration as rolled back: $FAILED"
npx prisma migrate resolve --rolled-back "$FAILED" || true

echo "==> Applying full schema"
npx prisma db push --skip-generate

echo "==> Marking all migrations as applied"
for dir in prisma/migrations/*/; do
  [[ -d "$dir" ]] || continue
  name="$(basename "$dir")"
  echo "    - $name"
  npx prisma migrate resolve --applied "$name"
done

echo "==> Verifying migration state"
npx prisma migrate deploy

echo "==> Seeding compliance frameworks (first deploy)"
npm run db:seed

echo "==> Bootstrap complete"
