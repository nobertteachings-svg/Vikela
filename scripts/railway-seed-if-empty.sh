#!/usr/bin/env bash
# Seed compliance frameworks on first Railway API deploy when the DB is empty.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/apps/api"

count="$(npx tsx --eval "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const n = await prisma.framework.count();
await prisma.\$disconnect();
process.stdout.write(String(n));
")"

if [[ "$count" == "0" ]]; then
  echo "==> No frameworks in database — running seed"
  npm run db:seed
else
  echo "==> Database already has $count framework(s) — skipping seed"
fi
