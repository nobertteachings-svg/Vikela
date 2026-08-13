# Vikela. Production Readiness Audit

**Last updated:** August 12, 2026  
**Scope:** `vikela` monorepo (`apps/web`, `apps/api`, `packages/shared`)  
**Companion docs:** [DEVELOPER_HANDOVER.md](./DEVELOPER_HANDOVER.md) · [STAGING_SMOKE_CHECKLIST.md](./STAGING_SMOKE_CHECKLIST.md) · [SMOKE_RUN_LOCAL.md](./SMOKE_RUN_LOCAL.md)

This audit tracks what is **implemented**, what **still blocks production**, and what remains for enterprise scale. Use it with the handover doc for file-level detail and the staging checklist as the pre-launch gate.

> **Note (Aug 2026):** Some May 2026 rows below were stale. Trust center and AuditEvent UI are implemented; see updated status in the tables. Local `demo` org seed is for development only, production never silently falls back to the `demo` slug.

---

## Executive Summary

| Area | Status | Notes |
|------|--------|--------|
| Core compliance loop (scan → gap → control) | **Ready** | Real API + Postgres; demo seed for local dev only |
| Multi-tenant security | **Ready** | Clerk required in production; header org blocked without session |
| Auth (Clerk + API) | **Ready** | JWT via `@clerk/fastify`; API fails boot without `CLERK_SECRET_KEY` in production |
| Role-based API authorization | **Ready** | `OWNER`/`ADMIN` for admin writes; `MEMBER` for mutations; `AUDITOR` read-only |
| Onboarding & membership bootstrap | **Ready** | Clerk org sync, `ensure-membership`, lite scan flow, bootstrap path allowlist |
| Billing & subscriptions | **Ready** | Stripe Checkout, portal, webhooks; plan limits enforced on scans/seats/integrations |
| Product surfaces | **Ready** | Settings, vendors, training, billing, team invites wired to API |
| Deploy & CI/CD | **Ready** | CI runs build + API unit tests + Playwright E2E with docker-compose services |
| Database migrations | **Ready** | Through `20250523180000_scan_parent_scan_id` |
| Automated tests | **Improved** | 16 API unit test modules + Playwright smoke + `scripts/smoke-api-local.sh` (26 checks) |
| Evidence storage | **Dual** | S3 when `AWS_S3_*` set; else local `uploads/evidence`; upload UI + org scoping |
| Observability | **Scaffolded** | Sentry on API + web when DSN set |
| Email | **Scaffolded** | Resend for scan complete, gap alerts, member invites when `RESEND_API_KEY` set |
| Product analytics | **Scaffolded** | PostHog (web + API) when keys set; `lite_scan_completed` and related events |
| RAG / Copilot | **Hybrid** | OpenAI embeddings + cosine search when `OPENAI_API_KEY` set; else keywords |
| Immutable audit log | **Ready** | `AuditEvent` table + `/audit` admin UI + `GET /api/v1/audit-events` |
| Outbound org webhooks | **Ready** | HMAC-signed `scan.completed` / `gap.created` dispatch |
| Trust center | **Ready (basic public)** | In-app `/trust` admin + public `/trust/[slug]`; report requests persisted; no custom subdomain/CDN yet |

**Verdict:** Vikela is **ready for design-partner / paid beta** once Clerk, Stripe, Postgres, Redis, and production env vars are configured and [STAGING_SMOKE_CHECKLIST.md](./STAGING_SMOKE_CHECKLIST.md) passes on staging. **GA** still needs scanner accuracy hardening, gap suppressions, public trust center, full provider coverage, HIPAA, and operational queue metrics.

---

## Severity Legend

| Level | Meaning |
|-------|---------|
| **P0** | Security or data-loss risk; must fix before any production traffic |
| **P1** | Required for a credible paid launch |
| **P2** | Important for scale, ops, or enterprise sales |
| **P3** | Polish, completeness, or nice-to-have |

---

## Resolved Blockers (May 2026)

### P0. Security

| Item | Resolution |
|------|------------|
| Auth only when Clerk configured | `requireProductionClerkConfig()`. API throws on boot in production without `CLERK_SECRET_KEY` |
| No role-based authorization | `lib/authorization.ts`, `requireAdmin`, `requireWrite`, `requireRead` on routes |
| Header org fallback | `org-context.ts`, `X-Org-Slug` / `X-Clerk-Org-Id` ignored when auth enforced without Clerk session or internal secret |
| Cross-tenant scan/sync IDOR | Repository, cloud, and identity scan routes require org-scoped resources + `requireMutation` |
| Secret leakage in gaps/LLM | `lib/redact-secrets.ts`, redact before persist, API responses, and Claude prompts |
| API keys not authenticated | `lib/api-key-auth.ts` + auth guard, `Bearer vk_*` resolves org; admin-only blocked |
| Internal secret bypasses RBAC | Production blocks internal-secret writes without user session; read-only service auth restricted |
| Git webhooks fail-open | GitHub/GitLab/Bitbucket webhooks reject unsigned or unconfigured requests in production |
| AWS connect demo org default | `connectAwsAccount` requires explicit `orgSlug`; connect routes require `requireAdmin` |
| Cloud/identity connect unguarded | Azure/GCP/JumpCloud connect + OAuth URLs require `requireAdmin` |
| Org API key IP bypass | `Organization.settings.security.ipAllowlist` enforced in auth guard for `Bearer vk_*` requests |

### P1. Product

| Item | Resolution |
|------|------------|
| Settings UI mock | `GET/PATCH /api/v1/settings`, API keys, webhooks CRUD; settings page uses API |
| Vendor detail mock | `/vendors/[id]` RSC + extended `Vendor` fields in schema |
| Billing UI hybrid | `GET /billing` returns real usage meters + Stripe invoices when configured |
| Plan limits not enforced | `lib/plan-limits.ts`, scans/month, seats, integrations on connect/invite/scan |
| Training progress mock | `TrainingAssignment` model + `GET /training/progress` |
| Evidence upload E2E | `EvidenceUpload` component + Playwright multipart test |
| Demo org confusion | Seed only applies to `demo` slug for local/dev; production requires Clerk org context (no silent `demo` fallback) |
| Team pending invites static | `PendingInvite` table + `GET /members/invites` + Team page wired to API |
| No onboarding path | Clerk onboarding routes + lite scan API + membership bootstrap paths |
| No product analytics | PostHog client (web) + server events via `lib/product-events.ts` |

### P1. Infrastructure

| Item | Resolution |
|------|------------|
| Deploy pipeline template | `deploy.yml`. Vercel web + Railway API hook + `db:migrate` step |
| CI E2E limited | `ci.yml`, docker-compose Postgres/Redis, migrate, seed, dev servers, Playwright |
| CORS allowlist | `CORS_ALLOWED_ORIGINS` env + `parseCorsOrigins()` in API bootstrap |
| Local regression script | `scripts/smoke-api-local.sh`, 26 API checks against seeded local org (`VIKELA_DEV_ORG_SLUG`, often `demo`) |

---

## Implemented (May 2026)

### Security & tenancy

| Item | Implementation |
|------|----------------|
| API authentication | `clerkPlugin` + `authGuardPlugin` (`apps/api/src/lib/auth.ts`, `plugins/auth-guard.ts`) |
| Production Clerk requirement | `requireProductionClerkConfig()` in `index.ts` |
| Role-based access | `lib/authorization.ts` applied to mutations, admin routes, policies, copilot, dashboard |
| Public API routes | Health, `/api/v1/webhooks/*`, `/api/v1/auth/*`, CloudFormation template |
| Web route protection | `middleware.ts`, app routes protected when Clerk publishable key is set; auditor redirect |
| Org resolution | `org-context.ts`. Clerk session first; headers only with session or internal secret |
| Membership gate | Auth guard blocks non-members except bootstrap paths (`lib/membership.ts`) |
| Audit log | `AuditEvent` + `lib/audit-log.ts` on invites, integrations, settings, org updates, gap status |
| Demo integrations | Blocked in production unless `ALLOW_DEMO_INTEGRATIONS=true` |
| Token encryption | AES-256-GCM (`ENCRYPTION_KEY`) |
| Secret redaction | `lib/redact-secrets.ts` on gap persist, API, copilot, Claude remediation |
| Org API keys | `Bearer vk_*` hashed lookup; scoped to org; no admin actions; IP allowlist enforced |
| Webhook verification | GitHub HMAC, GitLab token, Bitbucket HMAC, fail-closed in production |

### Product & API

| Item | Implementation |
|------|----------------|
| Settings | `routes/settings.ts`, notifications JSON, security (IP allowlist), API keys, webhooks |
| Vendors | Extended schema + `GET /vendors/:id` with detail fields |
| Billing | Usage from DB counts; Stripe invoices when customer exists |
| Plan limits | `assertCanEnqueueScan`, `assertCanInviteMember`, `assertCanConnectIntegration` |
| Training | `TrainingAssignment` + `GET /training/progress` |
| Evidence | Org-scoped file/download/patch/delete; client upload; audit ZIP export |
| Team | `GET /members`, `GET /members/invites`, `POST /members/invite` via Clerk + `PendingInvite` |
| Onboarding | `GET /onboarding/status`, `POST /onboarding/ensure-membership`, lite scan start/status |
| Lite scan | `services/scanner/lite-scan.ts`, stack detection, sample fallback, `isLiteScan` flag |
| Scan hierarchy | `Scan.parentScanId`, child scans grouped under full-scan parent |
| Trust center | `/trust` admin + public `/trust/[slug]` (publish/scores/tagline); report-request API persists + emails when Resend set |
| Outbound webhooks | `lib/dispatch-org-webhooks.ts`, signed events to `OrgWebhook` endpoints |
| Email notifications | `lib/notify-scan-emails.ts`, scan complete + gap alerts via Resend |
| Product events | `lib/product-events.ts`. PostHog + optional `PRODUCT_EVENTS_WEBHOOK_URL` |
| Audit trail UI | `/audit` + `GET /api/v1/audit-events` (`routes/audit.ts`) |

### Infrastructure

| Item | Implementation |
|------|----------------|
| Migrations | `20250522140000_production_features`, `20250523120000_production_blockers`, `20250523180000_scan_parent_scan_id` |
| CI | Build, lint, 16 API test modules, E2E job with services |
| Deploy | Vercel + Railway placeholders with secret-gated steps |
| Local smoke | `scripts/smoke-api-local.sh`, dev regression (not staging gate) |

---

## Remaining. P2 Enterprise & Scale

| Item | Status | Remediation |
|------|--------|-------------|
| Scanner accuracy | **Heuristic** | Document limits; false-positive / suppression workflow |
| Gap suppressions | **Not started** | Persist accepted false positives; exclude from posture score |
| Provider catalog | **Many stubs** | Hide or flag unimplemented providers in prod UI |
| Trust center | **Basic public** | Custom subdomain, CDN, visitor access controls beyond publish flag |
| Framework content | **SOC-2 heavy** | Content pipeline for HIPAA/ISO packs |
| Operational metrics | **Partial** | PostHog for product events; queue depth / worker health not exported |
| HIPAA / BAA | **Not started** | Legal + regional DB docs |
| Key rotation | **Undocumented** | KMS + rotation runbook |
| pgvector native | **Optional** | Currently JSON embeddings in Postgres |
| AuditEvent export | **Partial** | Admin UI + list API done; CSV/JSON export API still open |

---

## P3. Polish

| Item | Notes |
|------|--------|
| OpenAPI spec | Generate from Fastify for partners |
| ~~Legacy Next copilot route~~ | Removed, use API `/copilot/*` only |
| Sidebar nav | Labels from `product-config.ts` `navItems` |
| ~~Trust center report request~~ | Done, `POST /public/trust/:slug/report-request` persists + optional email |
| Risk owner display | `ownerId` may show "—" in UI (deferred) |

---

## Environment Variables. Production Matrix

| Variable | Production required? | Implemented? |
|----------|---------------------|--------------|
| `DATABASE_URL` | Yes | Yes |
| `REDIS_URL` | Yes (async scans) | Yes |
| `ENCRYPTION_KEY` | Yes | Yes |
| `ANTHROPIC_API_KEY` | Yes (copilot/policies) | Yes |
| `CLERK_SECRET_KEY` + publishable | **Yes (required in prod)** | Yes |
| `CLERK_WEBHOOK_SECRET` | Yes | Yes |
| `CORS_ALLOWED_ORIGINS` | Recommended | Yes |
| `GITHUB_*` / git providers | If offered | Yes |
| `GITHUB_WEBHOOK_SECRET` / `GITLAB_WEBHOOK_SECRET` / `BITBUCKET_WEBHOOK_SECRET` | **Yes if git webhooks enabled** | Yes |
| `AWS_VIKELA_*` | If AWS offered | Yes |
| `AWS_S3_*` | Yes for multi-instance evidence | Yes (when set) |
| `STRIPE_*` + price IDs | Yes for paid plans | Yes (when set) |
| `RESEND_API_KEY` | Recommended | Yes (when set) |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | Recommended | Yes (when set) |
| `POSTHOG_API_KEY` / `POSTHOG_HOST` | Recommended | Yes (when set) |
| `NEXT_PUBLIC_POSTHOG_KEY` / `NEXT_PUBLIC_POSTHOG_HOST` | Recommended | Yes (when set) |
| `PRODUCT_EVENTS_WEBHOOK_URL` | Optional | Yes (when set) |
| `OPENAI_API_KEY` | Optional (vector RAG) | Yes (when set) |
| `ALLOW_DEMO_INTEGRATIONS` | **Never in prod** | Yes (dev guard) |
| `INTERNAL_API_SECRET` | Dev only (never prod writes without user JWT) | Yes |
| `API_RATE_LIMIT_MAX` | Recommended | Yes |
| `RAILWAY_TOKEN` | For API deploy | Deploy workflow |
| `DISABLE_SCAN_WORKER` | **Never in prod** | Dev/CI only |

---

## Clerk organization roles (per environment)

Required before auditor invites work in each Clerk instance (dev, staging, prod):

- [ ] Create custom organization role **`org:auditor`** in Clerk Dashboard → Organizations → Roles
- [ ] Confirm role key matches API constants in `apps/api/src/lib/clerk-roles.ts`
- [ ] Smoke test: invite with `"role": "org:auditor"` via Clerk API or Team → Send invite (Auditor)
- [ ] If invite returns 422, the role is missing, not an application bug
- [ ] Inviter must hold Clerk **`org:admin`** (Vikela ADMIN/OWNER)

---

## Launch Checklist

### Phase A. Design partner

- [x] API Clerk JWT auth + auth guard
- [x] Production Clerk boot requirement
- [x] Role-based API authorization
- [x] Header org hardening
- [x] Protect app routes in middleware (when Clerk enabled)
- [x] Prisma migrations (through `scan_parent_scan_id`)
- [x] Onboarding + membership bootstrap
- [x] Real deploy pipeline secrets (documented)
- [ ] **Configure** Clerk, Stripe, DB, Redis in staging
- [ ] **Run** `npm run db:migrate && npm run db:seed`
- [ ] **Pass** [STAGING_SMOKE_CHECKLIST.md](./STAGING_SMOKE_CHECKLIST.md) on staging

### Phase B. Paid beta

- [x] Stripe checkout + webhooks
- [x] Plan limit enforcement in API
- [x] S3 evidence storage (when configured)
- [x] Settings persistence (notifications, API keys, webhooks, IP allowlist)
- [x] Vendor detail API page
- [x] CI Playwright with services
- [x] Evidence upload E2E test
- [x] Training member progress API
- [x] Team invites + pending invite list
- [x] Lite scan onboarding flow
- [x] PostHog product events (when keys set)
- [x] Scan/gap email notifications (when Resend set)
- [x] Outbound org webhooks

### Phase C. GA / enterprise

- [x] Audit event log (DB + `/audit` UI + list API)
- [ ] Scanner accuracy + suppressions
- [ ] Public trust center hardening (custom subdomain / CDN)
- [ ] HIPAA / data residency
- [ ] Full provider coverage or feature flags
- [ ] Operational metrics (queue depth, worker health)
- [ ] AuditEvent export API (CSV/JSON)

---

## Quick Commands

```bash
# Local setup
cp .env.example .env
docker compose up -d
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev

# Tests
npm run test                              # 16 API unit test modules
npm run test:e2e                          # needs web on :3000, API on :3001
./scripts/smoke-api-local.sh              # 26 local API checks (set VIKELA_DEV_ORG_SLUG)

# Stripe local webhook
stripe listen --forward-to localhost:3001/api/v1/webhooks/stripe
```

---

*For architecture and file-level detail, see [DEVELOPER_HANDOVER.md](./DEVELOPER_HANDOVER.md). For pre-launch verification, see [STAGING_SMOKE_CHECKLIST.md](./STAGING_SMOKE_CHECKLIST.md).*
