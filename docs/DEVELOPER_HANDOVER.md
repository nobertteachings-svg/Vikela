# Vikela — Developer Handover

**Last updated:** May 23, 2026  
**Audience:** Engineers onboarding to the Vikela monorepo  
**Tagline:** *Protect. Shield. Comply.* — Universal Compliance Engine

This document is the single read-through guide to how Vikela is built, how data flows, and where to change things safely.

**Production status (May 2026):** Ready for design-partner / paid beta after env configuration and a passing [STAGING_SMOKE_CHECKLIST.md](./STAGING_SMOKE_CHECKLIST.md) run. Security (auth, RBAC, tenant isolation, secret redaction, webhook verification) is implemented — see the audit for launch checklist and remaining P2/GA items.

**Related docs:**

- [PRODUCTION_READINESS_AUDIT.md](./PRODUCTION_READINESS_AUDIT.md) — launch gaps, security resolutions, env checklist
- [STAGING_SMOKE_CHECKLIST.md](./STAGING_SMOKE_CHECKLIST.md) — pre-launch gate on staging
- [SMOKE_RUN_LOCAL.md](./SMOKE_RUN_LOCAL.md) — local API smoke notes (not a staging substitute)

---

## 1. What Vikela Is

Vikela is a **B2B compliance platform** that:

1. Connects **source control** (GitHub, GitLab, Bitbucket), **cloud** (AWS, Azure, GCP), and **identity** (Okta, Azure AD, Google Workspace, JumpCloud).
2. Runs **scanners** that produce **gaps** (findings) mapped to **controls** and **frameworks** (SOC 2, HIPAA, ISO 27001, etc.).
3. Helps teams collect **evidence**, generate **policies**, use an **AI copilot** (Claude + RAG), and track posture on a **dashboard**.

New Clerk orgs go through an **onboarding flow** (connect repos → lite scan → dashboard) with membership bootstrapping when webhooks lag.

---

## 2. Repository Layout

```
vikela/
├── apps/
│   ├── api/                      # Fastify API, Prisma, BullMQ workers
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── routes/
│   │   │   ├── plugins/
│   │   │   ├── services/
│   │   │   ├── jobs/
│   │   │   └── lib/              # auth, authorization, membership, product-events, ip-allowlist, …
│   │   └── package.json
│   └── web/                      # Next.js 14 App Router
│       ├── app/
│       │   ├── (app)/            # Authenticated product routes
│       │   ├── (auth)/           # Sign-in, sign-up, onboarding wizard
│       │   ├── (marketing)/      # Landing, privacy, terms
│       │   └── api/auth/         # OAuth callbacks (GitHub, Azure, …)
│       ├── components/
│       └── lib/
├── packages/shared/
├── e2e/                          # Playwright (health + evidence upload)
├── scripts/
│   └── smoke-api-local.sh        # 26-check local API regression
├── docker-compose.yml
└── docs/
```

| App | Port | Command |
|-----|------|---------|
| Web | 3000 | `npm run dev -w @vikela/web` |
| API | 3001 | `npm run dev -w @vikela/api` |

---

## 3. Tech Stack

| Layer | Technology |
|-------|------------|
| Monorepo | npm workspaces, Turbo 2 |
| Language | TypeScript 5.6 |
| Web | Next.js 14.2, React 18, Tailwind |
| API | Fastify 5 |
| ORM | Prisma 6 → PostgreSQL |
| Queue | BullMQ + Redis |
| Auth | Clerk (required in production) |
| Payments | Stripe |
| Email | Resend |
| Analytics | PostHog (optional) |
| AI | Anthropic + optional OpenAI embeddings |

---

## 4. Local Development Setup

```bash
cp .env.example .env
# Required: ENCRYPTION_KEY — openssl rand -hex 32

docker compose up -d
npm install
npm run db:generate
npm run db:migrate
npm run db:seed             # Demo org slug: demo

npm run dev
```

**Without Clerk keys:** API uses org `demo`; web sends `X-Org-Slug: demo`. Optional `INTERNAL_API_SECRET` lets Next.js server components call the API without a JWT (dev only).

**With Clerk keys:** App routes require sign-in; API validates Bearer JWT (or org API key) and enforces roles. Onboarding routes under `/onboarding/*` are public in middleware.

**Never in production:** `ALLOW_DEMO_INTEGRATIONS=true`, `DISABLE_SCAN_WORKER=true`, unconfigured git webhook secrets, relying on `INTERNAL_API_SECRET` for server-side writes (production server components must use Clerk JWT).

---

## 5. Multi-Tenancy, Auth & Security

### API org resolution

File: `apps/api/src/lib/org-context.ts`

1. Org API key (`Bearer vk_*`) → `ApiKey.keyHash` → org
2. Clerk session `orgId` → `Organization.clerkOrgId`
3. Headers `X-Clerk-Org-Id` / `X-Org-Slug` — only when auth not enforced, user has Clerk session, or `X-Vikela-Internal-Secret` matches
4. Dev fallback: org `demo` when auth not enforced

### API authentication

| File | Role |
|------|------|
| `lib/auth.ts` | `isAuthEnforced()`, `requireProductionClerkConfig()`, public path allowlist |
| `plugins/auth-guard.ts` | JWT, org API key, or internal secret on `/api/v1/*` |
| `lib/api-key-auth.ts` | `Bearer vk_*` → SHA-256 hash lookup → `req.apiKeyAuth` |

**Auth guard order:** org API key → internal secret → Clerk JWT.

**Internal secret rules:** In production, internal secret alone cannot perform write mutations without a signed-in user. Next.js `server-api.ts` does not send internal secret in production — RSC/route handlers must use Clerk JWT.

**Membership gate:** After JWT auth, the guard verifies the user has a `Member` row for the session org — except on bootstrap paths (see below).

**Org API key IP allowlist:** When `Organization.settings.security.ipAllowlist` is non-empty, API key requests from other IPs receive HTTP 403. Implemented in `plugins/auth-guard.ts` via `lib/ip-allowlist.ts`.

### Membership bootstrap

File: `apps/api/src/lib/membership.ts`

Clerk webhooks normally create `Member` rows, but onboarding must work before the webhook arrives. These paths skip the membership check:

| Path | Purpose |
|------|---------|
| `GET /api/v1/onboarding/status` | Org + member readiness |
| `POST /api/v1/onboarding/ensure-membership` | Idempotent member create from session + pending invite |
| `POST /api/v1/onboarding/lite-scan` | Start onboarding scan |
| `GET /api/v1/onboarding/lite-scan/status` | Poll lite scan progress |

Clerk webhook handler: `routes/clerk-webhook.ts` — org create, membership sync, framework enrollment, `auditor_invite_accepted` event.

### API authorization

File: `apps/api/src/lib/authorization.ts`

| Helper | Allowed roles |
|--------|---------------|
| `requireAdmin` | OWNER, ADMIN |
| `requireMutation` / `requireWrite` | OWNER, ADMIN, MEMBER |
| `requireRead` | OWNER, ADMIN, MEMBER, AUDITOR |

**Special cases:**

- Org API keys can read and mutate, but **not** admin-only actions (integrations, billing, settings, publish/approve policies, etc.).
- Internal secret without user session: allowed for dev reads; blocked for production writes and admin actions.

**Role matrix (typical routes):**

| Role | Permissions |
|------|-------------|
| OWNER / ADMIN | Integrations, org settings, billing, member invite, API keys, cloud connect, policy approve/publish/delete, copilot reindex |
| MEMBER | Scans, evidence, policy generate/edit, copilot chat, questionnaires |
| AUDITOR | Read-only GET routes (dashboard, gaps, controls, copilot chat); web middleware redirects away from admin paths |

### Secret redaction

File: `apps/api/src/lib/redact-secrets.ts`

Redacts likely credentials from code snippets **before** persisting gaps, returning API responses, and sending prompts to Claude (copilot, policy generation, remediation). Never store or forward raw secrets from customer repos.

### Git webhook verification

Files: `services/git/github/github.webhook.ts`, `gitlab/gitlab.webhook.ts`, `routes/webhooks.ts`

In production, GitHub/GitLab/Bitbucket webhooks **fail closed** if secrets are missing or signatures invalid. Set `GITHUB_WEBHOOK_SECRET`, `GITLAB_WEBHOOK_SECRET`, and `BITBUCKET_WEBHOOK_SECRET` when enabling repo webhooks.

### Plan limits

File: `apps/api/src/lib/plan-limits.ts`

Enforced on:

- `POST /scans/*`, `POST /repositories/:id/scan`, `POST /cloud-accounts/:id/scan`, `POST /identity-integrations/:id/scan` — monthly scan cap
- `POST /members/invite` — seat cap
- `POST /integrations/:provider/connect` — integration cap (skips if reconnecting same provider)

Returns HTTP 402 with upgrade message when exceeded.

### Web authentication

| Context | File | Notes |
|---------|------|-------|
| Middleware | `middleware.ts` | Protects app routes when Clerk publishable key is set; auditors redirected from admin paths |
| Server Components | `lib/server-api.ts` | Clerk JWT + org headers; internal secret dev-only |
| Client | `components/comply/clerk-api-auth-bridge.tsx` | Bearer token + PostHog identify/group |

---

## 6. Data Model (Prisma)

Key models beyond core compliance entities:

| Model | Purpose |
|-------|---------|
| `Organization.settings` | JSON — notifications, security prefs (incl. `ipAllowlist`) |
| `Member` | Clerk user ↔ org with Vikela role |
| `PendingInvite` | Outstanding Clerk invites (email, role, expiry) |
| `ApiKey` | Hashed API keys per org |
| `OrgWebhook` | Outbound webhook endpoints |
| `TrainingAssignment` | Per-member module progress |
| `AuditEvent` | Immutable admin action log (DB only — no dedicated UI yet) |
| `Vendor` | Extended fields: score, documents, subprocessors, etc. |
| `Scan.parentScanId` | Links child scans to a full-scan parent; lite scans use `isLiteScan` |
| `Gap.isSample` | Sample/onboarding gaps excluded from RAG via `openRealGapsWhere()` |

**Migrations:**

```bash
npm run db:migrate:dev -- --name your_change
npm run db:migrate
```

Latest: `20250523180000_scan_parent_scan_id`

---

## 7. Onboarding Flow

### Web routes (public in middleware)

| Route | Step |
|-------|------|
| `/onboarding/connect-repos` | Connect Git provider |
| `/onboarding/connect-cloud` | Optional cloud connect |
| `/onboarding/scan` | Lite scan progress UI |
| `/onboarding/team` | Invite teammates |
| `/onboarding/frameworks` | Select frameworks |

Components live under `components/onboarding/`. After sign-up, Clerk redirects to `/onboarding/connect-repos` (`NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL`).

### API

File: `apps/api/src/routes/onboarding.ts`

Lite scan (`services/scanner/lite-scan.ts`):

1. Detects repo stack via `listFiles` when a repo is connected
2. Runs `executeCodeScan` or falls back to labeled sample gaps
3. Sets `Scan.isLiteScan = true`
4. Emits `lite_scan_completed` via `trackLiteScanCompleted()`

Full scans (`execute-full-scan.ts`) create a parent scan and child scans with `parentScanId`.

---

## 8. Web App Routes — Data Sources

| Route | Data source |
|-------|-------------|
| `/dashboard`, `/gaps`, `/controls`, … | **API** |
| `/vendors`, `/vendors/[id]` | **API** |
| `/training` | **API** (modules + `/training/progress`) |
| `/billing` | **API** (usage + Stripe invoices) |
| `/settings` | **API** (`/settings`, org patch) |
| `/team` | **API** (`/members`, `/members/invites`) |
| `/evidence` | **API** + client upload |
| `/audit` | **API** (scan history via `/scans`) |
| `/trust` | **API** (org, frameworks, policies — in-app preview) |
| `/onboarding/*` | **API** (onboarding + lite scan) |
| Sidebar labels | `mock-data.ts` `navItems` only |

---

## 9. API Routes Reference

### RBAC by route group

All org-scoped routes resolve tenant via `resolveOrganization` / `requireOrganization`. Mutations must verify resource `orgId` matches (prevents cross-tenant IDOR).

| Route group | Read | Write / mutate | Admin-only |
|-------------|------|----------------|------------|
| Dashboard, gaps, controls, frameworks, risks, vendors, training | `requireRead` | — | — |
| Scans, evidence, questionnaires, repositories (scan) | `requireRead` | `requireMutation` + plan limits | sync repos: `requireAdmin` |
| Policies | `requireRead` | generate/edit: `requireMutation` | approve, publish, delete: `requireAdmin` |
| Copilot | `requireRead` (chat, explain) | create thread: `requireMutation` | reindex: `requireAdmin` |
| Integrations, AWS/Azure/GCP connect, JumpCloud | `requireRead` | — | `requireAdmin` |
| Settings, billing checkout, members invite | `requireRead` | — | `requireAdmin` |
| Org patch | — | — | `requireAdmin` |
| Onboarding | Auth required when enforced | lite scan: any authenticated member | — |

Org API keys (`vk_*`) follow the same matrix but cannot perform admin-only actions.

### Settings

| Method | Path |
|--------|------|
| GET | `/settings` |
| PATCH | `/settings` |
| POST | `/settings/api-keys` |
| DELETE | `/settings/api-keys/:id` |
| POST | `/settings/webhooks` |
| DELETE | `/settings/webhooks/:id` |

Settings JSON shape: `lib/org-settings.ts` — `notifications.*`, `security.mfaRequired`, `security.ssoEnforced`, `security.ipAllowlist[]`.

### Members

| Method | Path |
|--------|------|
| GET | `/members` |
| GET | `/members/invites` |
| POST | `/members/invite` |

Invites go through Clerk; pending rows tracked in `PendingInvite` (`lib/pending-invite.ts`).

### Onboarding

| Method | Path |
|--------|------|
| GET | `/onboarding/status` |
| POST | `/onboarding/ensure-membership` |
| POST | `/onboarding/lite-scan` |
| GET | `/onboarding/lite-scan/status?scanId=` |

### Training

| Method | Path |
|--------|------|
| GET | `/training` |
| GET | `/training/progress` |

### Billing

`GET /billing` includes `usage`, `invoices`, `paymentMethod` when Stripe configured.

All mutation routes check roles and plan limits where applicable.

---

## 10. Evidence Storage & Upload

- API: `POST /api/v1/evidence` (multipart)
- Export: `POST /api/v1/evidence/export` — ZIP audit package (`services/evidence/export-audit-package.ts`)
- Web: `components/evidence/evidence-upload.tsx`
- Files scoped by `orgId` on read/update/delete/download

---

## 11. Notifications, Webhooks & Analytics

### Email (Resend)

File: `lib/notify-scan-emails.ts` + `lib/email.ts`

When `RESEND_API_KEY` is set and org notification prefs allow:

- Scan complete emails to admins
- Gap alert emails for CRITICAL/HIGH findings

Respects `Organization.settings.notifications` via `lib/notify-helpers.ts`.

### Outbound org webhooks

File: `lib/dispatch-org-webhooks.ts`

Signed HMAC payloads to configured `OrgWebhook` endpoints:

- `scan.completed`
- `gap.created`

### Product analytics (PostHog)

| Layer | File |
|-------|------|
| API | `lib/posthog.ts`, `lib/product-events.ts` |
| Web | `lib/posthog-client.ts`, `clerk-api-auth-bridge.tsx` |

Key events: `lite_scan_completed`, `auditor_invite_accepted`, `audit_export_downloaded`. Dev logs to console as `[product-event]`. Optional fan-out via `PRODUCT_EVENTS_WEBHOOK_URL`.

---

## 12. Testing & CI

| Command | What it runs |
|---------|--------------|
| `npm run test` | 16 API unit test modules under `apps/api/src/__tests__/` |
| `npm run test:e2e` | Playwright — home, health, evidence upload |
| `npm run build` | Full monorepo build |
| `./scripts/smoke-api-local.sh` | 26 local API checks (demo org; not staging gate) |

**API test modules:** `health`, `redact-secrets`, `ip-allowlist`, `gap-query`, `scan-query`, `membership`, `clerk-invite`, `web-clerk-roles`, `product-events`, `framework-score`, `audit-date-range`, `notify-helpers`, `dispatch-org-webhooks`, `collect-from-gaps`, `detect-repo-stack`, `gitlab-link-header`.

CI (`.github/workflows/ci.yml`):

1. Build, lint, API tests
2. E2E job: docker-compose → migrate → seed → dev servers (`DISABLE_SCAN_WORKER=true`) → Playwright

---

## 13. Deploy

`.github/workflows/deploy.yml`:

- **Web:** Vercel (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`)
- **API:** `npm run db:migrate` then Railway (`RAILWAY_TOKEN`) or your container registry

Set `CORS_ALLOWED_ORIGINS` to your production web URL(s). Do **not** set `DISABLE_SCAN_WORKER` in production — lite scans and async jobs require the BullMQ worker.

---

## 14. Environment Variables

See `.env.example`. Production-critical:

| Group | Keys |
|-------|------|
| Core | `ENCRYPTION_KEY`, `DATABASE_URL`, `REDIS_URL`, `APP_URL`, `API_URL`, `PORT` |
| Auth | `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_WEBHOOK_SECRET` |
| CORS | `CORS_ALLOWED_ORIGINS` |
| Git webhooks | `GITHUB_WEBHOOK_SECRET`, `GITLAB_WEBHOOK_SECRET`, `BITBUCKET_WEBHOOK_SECRET` (required if webhooks enabled) |
| Billing | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, price IDs |
| Evidence | `AWS_S3_*` (required for multi-instance / production file storage) |
| AI | `ANTHROPIC_API_KEY` (required); `OPENAI_API_KEY` (optional, vector RAG) |
| Email | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` |
| Analytics | `POSTHOG_API_KEY`, `POSTHOG_HOST`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` |
| Dev only | `INTERNAL_API_SECRET`, `VIKELA_DEV_ORG_SLUG`, `ALLOW_DEMO_INTEGRATIONS`, `DISABLE_SCAN_WORKER` |

---

## 15. Common Tasks

| Task | Where |
|------|-------|
| Add API route | `apps/api/src/routes/*.ts` + `index.ts` |
| Add role check | `requireAdmin` / `requireMutation` / `requireRead` from `lib/authorization.ts` |
| Add org API key support | Auth guard picks up `Bearer vk_*` automatically; org from `req.apiKeyAuth` |
| Redact secrets in new paths | `redactCodeSnippet()` from `lib/redact-secrets.ts` |
| Add plan gate | `assertCan*` from `lib/plan-limits.ts` |
| Change demo data | `apps/api/src/db/seed.ts` (demo slug only) |
| Log admin action | `logAuditEvent()` from `lib/audit-log.ts` |
| Track product event | `captureProductEvent()` from `lib/product-events.ts` |
| Add onboarding bootstrap path | Update `BOOTSTRAP_PATHS` in `lib/membership.ts` |
| Exclude sample gaps from RAG | Use `openRealGapsWhere()` from `lib/gap-query.ts` |

---

## 16. Known Quirks

1. **No Clerk in dev** — shared `demo` org unless Clerk keys are set.
2. **Sample gaps** — lite scan may insert `isSample: true` gaps; filter with `?isSample=false` or `openRealGapsWhere()` for real posture.
3. **Provider stubs** — many integration cards are catalog placeholders; hide or flag in prod UI.
4. **Scanner heuristics** — code/cloud findings are pattern-based; expect false positives until suppressions ship (P2).
5. **Copilot** — all chat flows use API `/api/v1/copilot/*` (legacy Next route removed).
6. **Trust center** — `/trust` is an in-app preview; report-request form has no backend yet.
7. **Audit page vs AuditEvent** — `/audit` shows scan history; `AuditEvent` table logs admin actions (no UI yet).
8. **CI disables worker** — `DISABLE_SCAN_WORKER=true` in CI; do not use in staging/production.

---

## 17. Key Files Index

| Topic | Path |
|-------|------|
| API entry | `apps/api/src/index.ts` |
| Auth | `apps/api/src/lib/auth.ts` |
| Auth guard | `apps/api/src/plugins/auth-guard.ts` |
| RBAC | `apps/api/src/lib/authorization.ts` |
| Membership bootstrap | `apps/api/src/lib/membership.ts` |
| Pending invites | `apps/api/src/lib/pending-invite.ts` |
| Org API keys | `apps/api/src/lib/api-key-auth.ts` |
| IP allowlist | `apps/api/src/lib/ip-allowlist.ts` |
| Org settings shape | `apps/api/src/lib/org-settings.ts` |
| Secret redaction | `apps/api/src/lib/redact-secrets.ts` |
| Org context | `apps/api/src/lib/org-context.ts` |
| Plan limits | `apps/api/src/lib/plan-limits.ts` |
| Audit log | `apps/api/src/lib/audit-log.ts` |
| Product events | `apps/api/src/lib/product-events.ts` |
| Outbound webhooks | `apps/api/src/lib/dispatch-org-webhooks.ts` |
| Scan emails | `apps/api/src/lib/notify-scan-emails.ts` |
| Lite scan | `apps/api/src/services/scanner/lite-scan.ts` |
| Onboarding API | `apps/api/src/routes/onboarding.ts` |
| Clerk webhook | `apps/api/src/routes/clerk-webhook.ts` |
| Settings API | `apps/api/src/routes/settings.ts` |
| Members API | `apps/api/src/routes/members.ts` |
| Policies API | `apps/api/src/routes/policies.ts` |
| Copilot API | `apps/api/src/routes/copilot.ts` |
| Git webhooks | `apps/api/src/routes/webhooks.ts` |
| Web server fetch | `apps/web/lib/server-api.ts` |
| PostHog (web) | `apps/web/lib/posthog-client.ts` |
| Evidence upload | `apps/web/components/evidence/evidence-upload.tsx` |
| Local smoke script | `scripts/smoke-api-local.sh` |
| Prisma | `apps/api/prisma/schema.prisma` |
| Production audit | `docs/PRODUCTION_READINESS_AUDIT.md` |
| Staging checklist | `docs/STAGING_SMOKE_CHECKLIST.md` |

---

## 18. Recommended Reading Order

1. This document  
2. [PRODUCTION_READINESS_AUDIT.md](./PRODUCTION_READINESS_AUDIT.md)  
3. [STAGING_SMOKE_CHECKLIST.md](./STAGING_SMOKE_CHECKLIST.md) (before any external demo)  
4. `apps/api/prisma/schema.prisma`  
5. `apps/api/src/lib/auth.ts` + `authorization.ts` + `membership.ts` + `org-context.ts`  
6. `apps/api/src/plugins/auth-guard.ts`  
7. `apps/api/src/index.ts`  

---

*Vikela © 2026 — Proprietary*
