#!/usr/bin/env bash
# Test Postgres connectivity (reads DATABASE_URL from repo .env)
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

URL="${DATABASE_URL:-}"
if [[ -z "$URL" ]]; then
  echo "DATABASE_URL is not set in .env"
  exit 1
fi

echo "Testing: ${URL%%:*}://***@${URL#*@}"
echo

if command -v psql >/dev/null 2>&1; then
  if psql "$URL" -c "SELECT 1 AS ok;" 2>/dev/null; then
    echo "psql: OK"
    exit 0
  fi
  echo "psql: failed (URI may not work with dotted pooler username on macOS libpq)"
fi

echo "Run: npm run db:local  (Docker Postgres) if Supabase CLI keeps failing."
