# Railway Deployment Guide

This guide explains how to deploy Vikela to Railway.

## Prerequisites

- Railway account ([railway.app](https://railway.app))
- GitHub repository with your Vikela code
- Clerk account for authentication (`ALLOW_DEMO_INTEGRATIONS` is local-dev only — keep `false` on Railway)

## Architecture on Railway

You'll need to create 4 services in your Railway project:

1. **PostgreSQL Database** - Railway PostgreSQL with pgvector extension
2. **Redis** - For BullMQ job queue
3. **Web App** - Next.js frontend (apps/web)
4. **API** - Fastify backend (apps/api)

## Step-by-Step Deployment

### 1. Create a New Railway Project

1. Go to [railway.app](https://railway.app) and click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your Vikela repository
4. Railway will analyze your repo and detect the services

### 2. Add PostgreSQL Database

1. In your Railway project, click "New Service"
2. Select "Database" → "PostgreSQL"
3. Railway will automatically enable the pgvector extension
4. Once created, click on the database service and copy the `DATABASE_URL` from the "Variables" tab

### 3. Add Redis

1. Click "New Service" again
2. Select "Database" → "Redis"
3. Once created, copy the `REDIS_URL` from the "Variables" tab

### 4. Configure the API Service

1. **Remove Root Directory** — leave it **empty** (repo root). Railway must see `package-lock.json` at the root.
2. In API service **Settings** → **Config file path**: `apps/api/railway.json`
3. Or set manually:
   - **Build Command:** `npm run build -w @vikela/api` (Nixpacks runs `npm ci` in the install phase — do not repeat it here)
   - **Start Command:** `bash scripts/railway-start-api.sh`

4. Add these environment variables to the API service:

```bash
# Required
NODE_ENV=production
DATABASE_URL={{RAILWAY_POSTGRES_DATABASE_URL}}
DIRECT_URL={{RAILWAY_POSTGRES_DATABASE_URL}}
REDIS_URL={{RAILWAY_REDIS_REDIS_URL}}
ENCRYPTION_KEY={{generate with: openssl rand -hex 32}}

# App URLs (replace with your Railway domain)
APP_URL=https://YOUR_WEB.up.railway.app
API_URL=https://YOUR_API.up.railway.app

# Auth (required for production)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_REPLACE_ME
CLERK_PUBLISHABLE_KEY=pk_test_REPLACE_ME
CLERK_SECRET_KEY=sk_test_REPLACE_ME
CLERK_WEBHOOK_SECRET=whsec_REPLACE_ME

# Local-dev only — keep false in production. Never enable demo integrations on Railway.
ALLOW_DEMO_INTEGRATIONS=false
VIKELA_DEV_ORG_SLUG=demo

# Rate limiting
API_RATE_LIMIT_MAX=300

# CORS (add your Railway web app domain)
CORS_ALLOWED_ORIGINS=https://YOUR_WEB.up.railway.app

# Disable scan worker if needed
DISABLE_SCAN_WORKER=false

# AI (optional)
ANTHROPIC_API_KEY=sk-ant-api03-REPLACE_ME

# GitHub — public App required for customer install (Railway/Vercel-style)
# See "GitHub App setup" section below.
GITHUB_APP_ID=YOUR_GITHUB_APP_ID
GITHUB_APP_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----\nREPLACE_WITH_GITHUB_APP_PEM\n-----END RSA PRIVATE KEY-----\n
GITHUB_APP_SLUG=YOUR_GITHUB_APP_SLUG
GITHUB_WEBHOOK_SECRET=replace-me
GITHUB_CLIENT_ID=YOUR_GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET=replace-me
GITHUB_REDIRECT_URI=https://YOUR_WEB.up.railway.app/api/auth/github/callback

# Cloud scanning (optional)
AWS_VIKELA_ACCOUNT_ID=
AWS_VIKELA_ACCESS_KEY_ID=
AWS_VIKELA_SECRET_ACCESS_KEY=
AWS_EXTERNAL_ID=vikela-scanner
CLOUD_SCAN_CRON=0 2 * * *

# Identity scanning (optional)
IDENTITY_SCAN_CRON=0 3 * * *

# Evidence storage (optional - for file uploads)
AWS_S3_ACCESS_KEY_ID=
AWS_S3_SECRET_ACCESS_KEY=
AWS_S3_REGION=us-east-1
AWS_S3_BUCKET=vikela-evidence

# Observability (optional)
SENTRY_DSN=
POSTHOG_API_KEY=

# Billing (optional)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

### 5. Configure the Web Service

1. **Root Directory** — leave **empty** (repo root). Do not set `apps/web`.
2. In Web service **Settings** → **Config file path**: `apps/web/railway.json`
3. Or set manually:
   - **Builder:** Nixpacks
   - **Build Command:** `npm run build -w @vikela/shared && npm run build -w @vikela/web` (Nixpacks runs `npm ci --include=dev` in the install phase — do not repeat it here)
   - **Start Command:** `npm run start -w @vikela/web`
   - **Healthcheck Path:** `/`
4. Clear any dashboard overrides that use `cd ../..` or `npm run start` without the workspace flag — those only applied when Root Directory was `apps/web`.

5. Add these environment variables to the web service:

```bash
# Required
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://YOUR_API.up.railway.app

# Auth (same Clerk application as API — both keys required on Web)
CLERK_SECRET_KEY=sk_test_REPLACE_ME
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_REPLACE_ME
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding/connect-repos

# Observability (optional)
NEXT_PUBLIC_SENTRY_DSN=
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# AI (optional)
ANTHROPIC_API_KEY=sk-ant-api03-REPLACE_ME

# Server-side proxy to API (optional; private Railway domain is fine)
API_URL=https://YOUR_API.up.railway.app
```

### 5b. GitHub App setup (required for repo connect)

Vikela uses a **public GitHub App** install flow (same model as Railway / Vercel / Render). A **private** App blocks non-owners with “This is a private GitHub App” and repos never sync.

1. GitHub → **Settings** → **Developer settings** → **GitHub Apps** → your app (e.g. `vikela1`)
2. **Make public** (Advanced → Make public). Without this, customer install keeps failing.
3. Permissions (read): **Contents**, **Metadata**, **Pull requests** (optional: Commit statuses)
4. **Setup URL** and **Callback URL**:  
   `https://<your-web-domain>/api/auth/github/callback`
5. **Webhook URL**:  
   `https://<your-api-domain>/api/v1/webhooks/github`  
   Set a webhook secret → `GITHUB_WEBHOOK_SECRET` on the API
6. Generate a private key → paste the full PEM into `GITHUB_APP_PRIVATE_KEY` on the API  
   (must include `BEGIN … PRIVATE KEY`, not a SHA256 fingerprint). On Railway, escape newlines as `\n`.
7. Copy **App ID** → `GITHUB_APP_ID`, slug → `GITHUB_APP_SLUG`, and the App’s **Client ID / Client secret** → `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` (OAuth fallback).
8. Set `GITHUB_REDIRECT_URI` to the same Setup/Callback URL as above.

**Connect flow:** user clicks Connect GitHub → GitHub install wizard → **Only select repositories** → callback with `installation_id` → Vikela syncs granted repos → user picks which to scan.

OAuth (`/api/auth/github/oauth`) remains a fallback when the App PEM is missing.

### 6. Run Database Migrations

Migrations run automatically on API startup via `start:railway` (`prisma migrate deploy` then `node dist/index.js`).

To run manually (Railway API service → **Shell**):

```bash
npx prisma migrate deploy
```

To seed compliance frameworks and controls (first deploy only):

```bash
npm run db:seed
```

### 7. Configure Service Networking

1. Go to your API service settings
2. Click "Networking"
3. Enable "Publicly accessible" if not already enabled
4. Copy the generated domain (e.g., `YOUR_API.up.railway.app`)

5. Go to your Web service settings
6. Click "Networking"
7. Enable "Publicly accessible"
8. Copy the generated domain

9. Update the environment variables in both services with the actual Railway domains:
   - API: `APP_URL`, `API_URL`, `CORS_ALLOWED_ORIGINS`
   - Web: `NEXT_PUBLIC_API_URL`

### 8. Configure Clerk Webhooks (if using Clerk)

1. Go to your Clerk dashboard
2. Add webhook endpoint:
   - `https://YOUR_API.up.railway.app/api/v1/webhooks/clerk`
3. Update the `CLERK_WEBHOOK_SECRET` in Railway with the secret from Clerk

### 9. Test the Deployment

1. Visit your web app URL: `https://YOUR_WEB.up.railway.app`
2. You should see the Vikela interface
3. Test authentication flow
4. Try connecting an integration or running a scan

## Railway-Specific Considerations

### Environment Variables Reference

Railway provides automatic references for database connections:
- `{{RAILWAY_POSTGRES_DATABASE_URL}}` - PostgreSQL connection string
- `{{RAILWAY_REDIS_REDIS_URL}}` - Redis connection string

Use these in your environment variables instead of hardcoding URLs.

### Build Configuration

The `railway.json` files in each app directory configure:
- Build commands
- Start commands
- Health checks
- Watch patterns for rebuilds

### Health Checks

Both services have health check endpoints:
- API: `/health`
- Web: `/`

Railway will automatically restart services if health checks fail.

### Storage

For evidence file uploads, you'll need to configure S3-compatible storage:
- Railway doesn't provide persistent file storage
- Use AWS S3, Cloudflare R2, or similar
- Set the `AWS_S3_*` environment variables

### Scaling

- Railway automatically scales based on demand
- For production, consider upgrading to paid plans for better performance
- The API service handles background jobs via BullMQ

## Troubleshooting

### Database Connection Errors

If you see "Can't reach database server" errors:
1. Check that PostgreSQL service is running
2. Verify `DATABASE_URL` and `DIRECT_URL` environment variables
3. Ensure the API service can connect to the database (check Railway networking)

### Failed migration (P3009)

If deploy logs show `P3009` / `migrate found failed migrations`:

The repo has incremental migrations but no initial baseline; a first deploy may fail mid-migration and block startup.

**Automatic recovery:** `scripts/railway-start-api.sh` detects P3009/P3005, runs `db push`, marks migrations applied, and retries.

**Manual fix (Railway API → Shell):**

```bash
bash scripts/railway-db-bootstrap.sh
```

Or step by step:

```bash
cd apps/api
npx prisma migrate resolve --rolled-back "20250522140000_production_features"
npx prisma db push
npx prisma migrate resolve --applied "20250522140000_production_features"
npx prisma migrate resolve --applied "20250523120000_production_blockers"
npx prisma migrate resolve --applied "20250523180000_scan_parent_scan_id"
npm run db:seed
```

Then redeploy the API service.

### Clerk handshake / secret-key-invalid (Web 500)

If deploy logs show `Clerk: Handshake token verification failed` / `secret-key-invalid`:

1. In [Clerk Dashboard](https://dashboard.clerk.com) → your app → **API Keys**, copy the **publishable** and **secret** keys from the **same** application.
2. On the **Web** service, set:
   - `CLERK_SECRET_KEY` = `sk_test_...` or `sk_live_...`
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` = matching `pk_test_...` or `pk_live_...`
3. Keys must be a matching pair (both test or both live — not mixed).
4. No quotes or trailing spaces in Railway variable values.
5. After changing any `NEXT_PUBLIC_*` variable, **redeploy** (Next.js bakes them in at build time). `CLERK_SECRET_KEY` alone only needs a service restart/redeploy.

### Build Failures

If builds fail:
1. Check the build logs in Railway
2. Ensure Node.js version is >= 18 (Railway defaults to recent versions)
3. Verify all dependencies are in package.json

### Redis Connection Errors

If Redis fails:
1. Check Redis service is running
2. Verify `REDIS_URL` environment variable
3. Ensure BullMQ can connect to Redis

### Scheduled Jobs Not Running

The scheduled jobs (identity scan, cloud scan) run via BullMQ:
1. Ensure `DISABLE_SCAN_WORKER=false` or not set
2. Check Redis is accessible
3. Verify cron schedules in environment variables

## Cost Estimate

Railway pricing (as of 2025):
- Free tier: $5/month credit (good for testing)
- PostgreSQL: ~$10/month for basic plan
- Redis: ~$5/month for basic plan
- Web/API services: ~$5-10/month each depending on usage

Estimated total for production: ~$30-50/month

## Alternative: Single Service Deployment

For simpler deployments, you can deploy everything as a single service:

1. Use Docker Compose configuration
2. Deploy as a single Railway service with Docker
3. Less control over individual components

However, the multi-service approach above is recommended for better scalability and management.
