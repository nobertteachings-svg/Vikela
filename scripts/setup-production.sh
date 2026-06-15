#!/usr/bin/env bash
# Vikela production setup helper — installs deps, audits, validates env.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Installing dependencies..."
npm install

echo "==> Generating Prisma client..."
npm run db:generate

echo "==> Applying safe npm audit fixes..."
npm audit fix || true

echo ""
echo "==> Audit summary (remaining issues may need manual review):"
npm audit --audit-level=moderate 2>/dev/null || true

echo ""
echo "==> Checking production environment..."

ENV_FILE="${ENV_FILE:-.env}"
MISSING=0

check_var() {
  local name="$1"
  local required="${2:-required}"
  if [[ -f "$ENV_FILE" ]]; then
    if ! grep -q "^${name}=" "$ENV_FILE" 2>/dev/null; then
      echo "  MISSING: $name"
      MISSING=$((MISSING + 1))
      return
    fi
    local val
    val=$(grep "^${name}=" "$ENV_FILE" | cut -d= -f2- | tr -d '"' | tr -d "'")
    if [[ -z "$val" && "$required" == "required" ]]; then
      echo "  EMPTY:   $name"
      MISSING=$((MISSING + 1))
    elif [[ "$name" == *CLERK*KEY* && "$val" == pk_test_* ]]; then
      echo "  WARN:    $name is a TEST key — use pk_live_/sk_live_ for production"
    elif [[ "$name" == *CLERK*KEY* && "$val" == sk_test_* ]]; then
      echo "  WARN:    $name is a TEST key — use pk_live_/sk_live_ for production"
    else
      echo "  OK:      $name"
    fi
  else
    echo "  No $ENV_FILE found — copy .env.production.example and fill in values"
    MISSING=$((MISSING + 1))
  fi
}

if [[ -f "$ENV_FILE" ]]; then
  check_var NODE_ENV
  check_var ENCRYPTION_KEY
  check_var DATABASE_URL
  check_var REDIS_URL
  check_var CLERK_SECRET_KEY
  check_var NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  check_var APP_URL
  check_var API_URL
  check_var NEXT_PUBLIC_API_URL

  if grep -q "^ALLOW_DEMO_INTEGRATIONS=true" "$ENV_FILE" 2>/dev/null; then
    echo "  WARN:    ALLOW_DEMO_INTEGRATIONS=true — set to false in production"
  fi
fi

echo ""
echo "==> Running API unit tests..."
npm run test

echo ""
if [[ $MISSING -gt 0 ]]; then
  echo "Setup complete with $MISSING env issue(s). See .env.production.example and docs/PRODUCTION_SETUP.md"
  exit 1
fi

echo "Setup complete. Next steps:"
echo "  1. Configure Clerk production app (docs/PRODUCTION_SETUP.md)"
echo "  2. Set env vars on Vercel (web) and Railway/API host"
echo "  3. npm run db:migrate && npm run db:seed (first deploy only)"
echo "  4. Run staging smoke: docs/STAGING_SMOKE_CHECKLIST.md"
