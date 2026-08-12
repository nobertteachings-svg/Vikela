#!/usr/bin/env bash
# Update APP_URL + OAuth redirect URIs in .env from the active ngrok web tunnel (port 3000).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/.env}"

NGROK_API="${NGROK_API:-http://127.0.0.1:4040/api/tunnels}"
NGROK="$(curl -sf "$NGROK_API" | python3 -c "
import sys, json
tunnels = json.load(sys.stdin).get('tunnels') or []
# Prefer tunnel pointing at local web (:3000)
for t in tunnels:
    addr = (t.get('config') or {}).get('addr') or ''
    url = t.get('public_url') or ''
    if url.startswith('https') and (':3000' in addr or addr.endswith('3000')):
        print(url.rstrip('/'))
        raise SystemExit
for t in tunnels:
    url = t.get('public_url') or ''
    if url.startswith('https'):
        print(url.rstrip('/'))
        raise SystemExit
raise SystemExit('No https ngrok tunnel found — start: ngrok http 3000')
")"

python3 - "$ENV_FILE" "$NGROK" <<'PY'
from pathlib import Path
import re, sys
env_path = Path(sys.argv[1])
ngrok = sys.argv[2].rstrip("/")
web_keys = {
    "APP_URL",
    "GITHUB_REDIRECT_URI",
    "GITLAB_REDIRECT_URI",
    "BITBUCKET_REDIRECT_URI",
    "AZURE_REDIRECT_URI",
    "AZURE_CLOUD_REDIRECT_URI",
    "GCP_REDIRECT_URI",
    "GCP_CLOUD_REDIRECT_URI",
    "DO_REDIRECT_URI",
    "OKTA_REDIRECT_URI",
    "AZURE_AD_REDIRECT_URI",
    "GOOGLE_WORKSPACE_REDIRECT_URI",
}
lines = env_path.read_text().splitlines()
out, changed = [], []
for line in lines:
    if not line.strip() or line.strip().startswith("#") or "=" not in line:
        out.append(line)
        continue
    k, v = line.split("=", 1)
    key, val = k.strip(), v.strip()
    if key not in web_keys:
        out.append(line)
        continue
    m = re.match(r"https?://[^/]+(/.*)?$", val)
    suffix = (m.group(1) or "") if m else ""
    suffix = suffix.replace("//", "/")
    new_val = f"{ngrok}{suffix}" if suffix else ngrok
    out.append(f"{key}={new_val}")
    if new_val != val:
        changed.append(key)
env_path.write_text("\n".join(out) + "\n")
print(f"ngrok: {ngrok}")
print(f"updated: {', '.join(changed) if changed else '(no changes)'}")
print(f"Clerk webhook URL: {ngrok}/api/v1/webhooks/clerk")
PY
