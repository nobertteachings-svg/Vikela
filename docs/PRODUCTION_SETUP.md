# Production setup guide

Use this checklist to move Shieldoq from local demo mode to production.

## 1. Install dependencies and fix audit issues

```bash
npm run setup              # npm install + prisma generate
npm audit fix              # safe fixes (esbuild, js-cookie, etc.)
npm run test               # 79+ API unit tests
npm run test:e2e           # Playwright (needs dev servers or CI)
```

If `npm audit` still reports issues in `@next/eslint-plugin-next` / `glob`, those are dev-only ESLint deps, acceptable until you upgrade Next.js.

We removed unused `@clerk/ui` from the root package (it pulled in Solana wallet vulnerabilities).

## 2. Clerk, switch from test to production

You currently use **test** keys (`pk_test_…`, `sk_test_…`). For production:

### A. Create a production Clerk instance

1. Open [Clerk Dashboard](https://dashboard.clerk.com)
2. Create or select your **Production** application (not Development)
3. Copy **Publishable key** (`pk_live_…`) and **Secret key** (`sk_live_…`)

### B. Set environment variables

**Web (Vercel)**: `apps/web` or project root:

| Variable | Value |
|----------|--------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_…` |
| `CLERK_SECRET_KEY` | `sk_live_…` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | `/dashboard` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | `/onboarding/connect-repos` |

**API (Railway / etc.)**:

| Variable | Value |
|----------|--------|
| `CLERK_SECRET_KEY` | `sk_live_…` (same secret) |
| `CLERK_PUBLISHABLE_KEY` | `pk_live_…` |
| `CLERK_WEBHOOK_SECRET` | from webhook below |

### C. Clerk webhook (org sync)

1. Clerk Dashboard → **Webhooks** → Add endpoint  
   `https://api.yourdomain.com/api/v1/webhooks/clerk`
2. Subscribe to: `organization.created`, `organization.updated`, `organizationMembership.created`, `organizationMembership.updated`, `organizationMembership.deleted`
3. Copy **Signing secret** → `CLERK_WEBHOOK_SECRET`

### D. Allowed origins & redirects

In Clerk → **Domains**, add:

- `https://app.yourdomain.com`
- Production API URL if Clerk needs it for JWT

Update OAuth redirect URIs for GitHub/GitLab/etc. to use `https://app.yourdomain.com/api/auth/..` (see `.env.production.example`).

## 3. Required production environment variables

Copy [`.env.production.example`](./.env.production.example) and fill every **required** section:

```bash
cp .env.production.example .env.production
# Edit values, do not commit
```

| Variable | Why |
|----------|-----|
| `NODE_ENV=production` | Enables auth enforcement, blocks demo integrations |
| `ENCRYPTION_KEY` | `openssl rand -hex 32`, encrypts integration tokens |
| `DATABASE_URL` / `DIRECT_URL` | Postgres (Supabase, Railway, Neon) |
| `REDIS_URL` | BullMQ scan workers |
| `APP_URL` / `API_URL` / `NEXT_PUBLIC_API_URL` | Must match deployed URLs |
| `CORS_ALLOWED_ORIGINS` | Web app origin for API |
| `CLERK_*` | Live keys + webhook secret |
| `ALLOW_DEMO_INTEGRATIONS=false` | **Never** `true` in prod |

The API **refuses to start** in production without `CLERK_SECRET_KEY` (`requireProductionClerkConfig`).

## 4. Disable demo mode

In your production `.env` / host dashboard:

```bash
ALLOW_DEMO_INTEGRATIONS=false
# Remove or leave unset:
# VIKELA_DEV_ORG_SLUG
# INTERNAL_API_SECRET  (do not use for user writes in prod)
```

## 5. Deploy checklist

```bash
npm run build
npm run db:migrate          # on API host
npm run db:seed             # first deploy only (framework catalog)
```

- **Web**: Vercel, root `apps/web`, env from step 3  
- **API**: Railway, `apps/api`, see [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md)  
- **Postgres + Redis**: Railway or managed services  

## 6. Verify production

Run [STAGING_SMOKE_CHECKLIST.md](./STAGING_SMOKE_CHECKLIST.md):

1. Sign up with Clerk (real user)
2. Create organization
3. Onboarding → connect repo → select frameworks → scan
4. Dashboard shows posture per framework
5. Settings → API keys / webhooks work

## Quick command

```bash
npm run setup:production
```

This installs deps, runs `npm audit fix`, checks your `.env`, and runs unit tests.
