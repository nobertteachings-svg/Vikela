#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Vikela Web build (repo root: $ROOT)"
npm ci
npm run build -w @vikela/web
echo "==> Web build complete"
