#!/usr/bin/env bash
# Validate Railway production wiring before build (web) or start (api).
# Usage: bash scripts/railway-validate-env.sh web|api
set -euo pipefail

SERVICE="${1:-}"
if [[ "$SERVICE" != "web" && "$SERVICE" != "api" ]]; then
  echo "Usage: bash scripts/railway-validate-env.sh web|api"
  exit 1
fi

if [[ "${NODE_ENV:-}" != "production" ]]; then
  echo "==> Skipping Railway env validation (NODE_ENV=${NODE_ENV:-development})"
  exit 0
fi

require_var() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "ERROR: $name is required on the $SERVICE service"
    exit 1
  fi
}

validate_base_url() {
  local name="$1"
  local url="$2"
  if [[ "$url" == *localhost* || "$url" == *127.0.0.1* ]]; then
    echo "ERROR: $name must be your Railway public URL, not localhost (got $url)"
    exit 1
  fi
  if [[ "$url" == */api/v1 || "$url" == */api ]]; then
    echo "ERROR: $name must not end with /api or /api/v1 (got $url)"
    exit 1
  fi
}

echo "==> Validating $SERVICE production environment"

case "$SERVICE" in
  api)
    require_var DATABASE_URL
    require_var DIRECT_URL
    require_var REDIS_URL
    require_var ENCRYPTION_KEY
    require_var APP_URL
    require_var CLERK_SECRET_KEY
    validate_base_url APP_URL "$APP_URL"
    if [[ "${DATABASE_URL:-}" == *localhost* ]]; then
      echo "ERROR: DATABASE_URL must reference Railway Postgres — use \${{Postgres.DATABASE_URL}}"
      exit 1
    fi
    if [[ "${REDIS_URL:-}" == *localhost* ]]; then
      echo "ERROR: REDIS_URL must reference Railway Redis — use \${{Redis.REDIS_URL}}"
      exit 1
    fi
    if [[ -z "${CORS_ALLOWED_ORIGINS:-}" ]]; then
      echo "WARN: CORS_ALLOWED_ORIGINS not set — set it to your Web Railway URL"
    fi
    ;;
  web)
    require_var NEXT_PUBLIC_API_URL
    require_var CLERK_SECRET_KEY
    require_var NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
    validate_base_url NEXT_PUBLIC_API_URL "$NEXT_PUBLIC_API_URL"
    ;;
esac

echo "==> $SERVICE environment OK"
