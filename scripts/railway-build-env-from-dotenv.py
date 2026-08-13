#!/usr/bin/env python3
"""Build Railway API/Web env payloads from local .env (secrets stay local to this run)."""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENV_PATH = ROOT / ".env"

# Never push local DB/Redis or Playwright/dev-only knobs as-is.
SKIP_KEYS = {
    "DATABASE_URL",
    "DIRECT_URL",
    "REDIS_URL",
    "PLAYWRIGHT_API_URL",
    "PLAYWRIGHT_BASE_URL",
    "VIKELA_DEV_ORG_SLUG",
    "EVIDENCE_UPLOAD_DIR",
    "PORT",  # Railway injects PORT
}

# Keys that must be production-forced regardless of local .env
FORCE_API = {
    "NODE_ENV": "production",
    "ALLOW_DEMO_INTEGRATIONS": "false",
    "DISABLE_SCAN_WORKER": "false",
    "API_RATE_LIMIT_MAX": "300",
    # Railway service references, names must match Railway service names
    "DATABASE_URL": "${{Postgres.DATABASE_URL}}",
    "DIRECT_URL": "${{Postgres.DATABASE_URL}}",
    "REDIS_URL": "${{Redis.REDIS_URL}}",
}

FORCE_WEB = {
    "NODE_ENV": "production",
}

# Web service keys (plus any NEXT_PUBLIC_* and Clerk)
WEB_KEYS = {
    "NODE_ENV",
    "NEXT_PUBLIC_API_URL",
    "API_URL",
    "CLERK_SECRET_KEY",
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_CLERK_SIGN_IN_URL",
    "NEXT_PUBLIC_CLERK_SIGN_UP_URL",
    "NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL",
    "NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL",
    "NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL",
    "NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL",
    "NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL",
    "NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL",
    "NEXT_PUBLIC_SENTRY_DSN",
    "NEXT_PUBLIC_POSTHOG_KEY",
    "NEXT_PUBLIC_POSTHOG_HOST",
    "ANTHROPIC_API_KEY",
}


def parse_env(path: Path) -> dict[str, str]:
    out: dict[str, str] = {}
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[len("export ") :]
        if "=" not in line:
            continue
        key, val = line.split("=", 1)
        key = key.strip()
        val = val.strip()
        if (val.startswith('"') and val.endswith('"')) or (
            val.startswith("'") and val.endswith("'")
        ):
            val = val[1:-1]
        out[key] = val
    return out


def is_localhost(url: str) -> bool:
    return "localhost" in url or "127.0.0.1" in url


def main() -> int:
    if not ENV_PATH.exists():
        print("Missing .env", file=sys.stderr)
        return 1

    env = parse_env(ENV_PATH)

    api: dict[str, str] = {}
    for k, v in env.items():
        if k in SKIP_KEYS:
            continue
        # Skip empty optional values
        if v == "":
            continue
        api[k] = v

    api.update(FORCE_API)

    # Don't leave localhost URLs on API, placeholder until domains exist
    for k in (
        "APP_URL",
        "API_URL",
        "CORS_ALLOWED_ORIGINS",
        "API_PUBLIC_URL",
        "GITHUB_REDIRECT_URI",
        "GITLAB_REDIRECT_URI",
        "BITBUCKET_REDIRECT_URI",
        "GCP_REDIRECT_URI",
        "GCP_CLOUD_REDIRECT_URI",
        "AZURE_REDIRECT_URI",
        "AZURE_CLOUD_REDIRECT_URI",
        "AZURE_AD_REDIRECT_URI",
        "OKTA_REDIRECT_URI",
        "GOOGLE_WORKSPACE_REDIRECT_URI",
        "SLACK_REDIRECT_URI",
        "AUTH0_REDIRECT_URI",
        "PAGERDUTY_REDIRECT_URI",
        "MICROSOFT_TEAMS_REDIRECT_URI",
        "DO_REDIRECT_URI",
        "CF_REDIRECT_URI",
        "ORACLE_REDIRECT_URI",
        "ALIBABA_REDIRECT_URI",
    ):
        if k in api and is_localhost(api[k]):
            # Keep key but mark for rewrite later; for now drop so validate doesn't use localhost
            del api[k]

    web: dict[str, str] = {}
    for k, v in env.items():
        if k in WEB_KEYS or k.startswith("NEXT_PUBLIC_"):
            if v == "":
                continue
            if is_localhost(v) and k in {
                "NEXT_PUBLIC_API_URL",
                "API_URL",
                "APP_URL",
            }:
                continue
            web[k] = v
    web.update(FORCE_WEB)

    # Ensure ENCRYPTION_KEY exists
    if not api.get("ENCRYPTION_KEY") or len(api.get("ENCRYPTION_KEY", "")) < 32:
        api["ENCRYPTION_KEY"] = subprocess.check_output(
            ["openssl", "rand", "-hex", "32"], text=True
        ).strip()

    out_dir = ROOT / ".railway-deploy"
    out_dir.mkdir(exist_ok=True)
    (out_dir / "api.env.json").write_text(json.dumps(api, indent=2))
    (out_dir / "web.env.json").write_text(json.dumps(web, indent=2))
    (out_dir / "api.keys.txt").write_text("\n".join(sorted(api.keys())) + "\n")
    (out_dir / "web.keys.txt").write_text("\n".join(sorted(web.keys())) + "\n")
    print(f"Wrote {len(api)} API vars and {len(web)} Web vars to .railway-deploy/")
    print("API keys:", ", ".join(sorted(api.keys())[:20]), "..")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
