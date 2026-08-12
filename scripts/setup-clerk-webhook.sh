#!/usr/bin/env bash
# Print the local Clerk webhook URL and open a Svix management login for this Clerk instance.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/.env}"

SK="$(python3 -c "
from pathlib import Path
for line in Path('$ENV_FILE').read_text().splitlines():
  if line.startswith('CLERK_SECRET_KEY=') and 'sk_' in line:
    print(line.split('=',1)[1].strip().strip('\"').strip(\"'\"))
    break
")"
if [[ -z "${SK:-}" ]]; then
  echo "CLERK_SECRET_KEY (sk_...) missing in $ENV_FILE" >&2
  exit 1
fi

NGROK="$(curl -sf http://127.0.0.1:4040/api/tunnels | python3 -c "
import sys, json
tunnels = json.load(sys.stdin).get('tunnels') or []
for t in tunnels:
    url = t.get('public_url') or ''
    addr = (t.get('config') or {}).get('addr') or ''
    if url.startswith('https') and (':3000' in addr or addr.endswith('3000')):
        print(url.rstrip('/')); raise SystemExit
for t in tunnels:
    url = t.get('public_url') or ''
    if url.startswith('https'):
        print(url.rstrip('/')); raise SystemExit
" 2>/dev/null || true)"

APP_URL="$(python3 -c "
from pathlib import Path
for line in Path('$ENV_FILE').read_text().splitlines():
  if line.startswith('APP_URL='):
    print(line.split('=',1)[1].strip()); break
")"

BASE="${NGROK:-$APP_URL}"
WEBHOOK="${BASE%/}/api/v1/webhooks/clerk"

echo "Webhook endpoint URL:"
echo "  $WEBHOOK"
echo
echo "Steps:"
echo "  1. Open the Svix URL printed below (Clerk webhook admin)."
echo "  2. Add endpoint → paste the URL above."
echo "  3. Subscribe to: organization.created, organization.updated,"
echo "     organizationMembership.created, organizationMembership.updated, organizationMembership.deleted"
echo "  4. Copy Signing Secret (whsec_...) into CLERK_WEBHOOK_SECRET in .env"
echo "  5. Restart the API"
echo

SVIX="$(curl -sS -X POST -H "Authorization: Bearer $SK" -H "Content-Type: application/json" \
  https://api.clerk.com/v1/webhooks/svix_url | python3 -c "import sys,json; print(json.load(sys.stdin).get('svix_url',''))")"
echo "Svix admin login:"
echo "  $SVIX"
if command -v open >/dev/null 2>&1 && [[ -n "$SVIX" ]]; then
  open "$SVIX" || true
fi
