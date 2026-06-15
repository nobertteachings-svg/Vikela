# Vikela Developer Handover Report

**Date:** June 15, 2026
**Project:** Vikela - Universal Compliance Engine
**Version:** 0.0.1

---

## Executive Summary

Vikela is a comprehensive compliance automation platform that helps startups achieve and maintain compliance with major frameworks like SOC 2, ISO 27001, HIPAA, GDPR, and ISO 42001. The platform scans code repositories, cloud infrastructure, and identity providers to identify compliance gaps and provides AI-powered remediation assistance.

**Current Status:** Development phase with core functionality implemented. Ready for deployment with proper configuration.

---

## What Vikela Does

### Core Purpose

Vikela automates compliance management by:
- **Scanning** code repositories for security and compliance issues
- **Monitoring** cloud infrastructure (AWS, Azure, GCP) for misconfigurations
- **Auditing** identity providers (Okta, Azure AD, Google Workspace) for security best practices
- **Providing** AI-powered assistance via Claude for gap explanations and remediation
- **Managing** evidence collection and policy generation for audits
- **Tracking** compliance progress across multiple frameworks

### Target Users

- Startups preparing for SOC 2, ISO 27001, or other compliance audits
- Security teams needing automated compliance monitoring
- DevOps teams integrating compliance into CI/CD pipelines
- Compliance officers managing audit preparation

---

## Architecture Overview

### Technology Stack

**Frontend (apps/web):**
- Next.js 14 with App Router
- React 18 with TypeScript
- Tailwind CSS for styling
- Radix UI components
- Clerk for authentication
- TanStack Query for data fetching
- Zustand for state management

**Backend (apps/api):**
- Fastify (Node.js web framework)
- Prisma ORM with PostgreSQL
- BullMQ for job queuing (Redis)
- AWS SDK for cloud scanning
- Anthropic Claude SDK for AI features
- Stripe for billing

**Infrastructure:**
- PostgreSQL with pgvector extension (for embeddings)
- Redis for job queue
- Docker Compose for local development
- Railway for cloud deployment

### System Architecture

```
┌─────────────┐     ┌──────────────────────────────────────────┐
│  apps/web   │────▶│  apps/api                                │
│  Next.js 14 │     │  Fastify + Prisma + BullMQ               │
└─────────────┘     │  ┌────────┐ ┌────────┐ ┌────────────┐  │
                    │  │ Git    │ │ Cloud  │ │ Identity   │  │
                    │  │Factory │ │Factory │ │ Factory    │  │
                    │  └────────┘ └────────┘ └────────────┘  │
                    └──────────────────────────────────────────┘
```

### Multi-Tenancy

The platform supports multi-tenant architecture:
- Organizations are isolated by `orgId` and `slug`
- API requests include `X-Org-Slug` header for tenant resolution
- Clerk webhooks sync organization creation
- Demo mode available for testing without Clerk

---

## Key Features

### 1. Code Scanning (Phase 2)

**Supported Platforms:**
- GitHub (App + OAuth)
- GitLab (OAuth)
- Bitbucket (OAuth)

**Scan Capabilities:**
- Secrets detection (API keys, tokens)
- Encryption verification
- Dependency analysis
- Access control checks
- Logging configuration
- Claude-powered remediation suggestions

**Integration:**
- GitHub App installation with webhooks
- GitLab/Bitbucket OAuth flow
- PR/MR review comments
- BullMQ async scanning on push events

### 2. Cloud Scanning (Phase 3)

**Supported Cloud Providers:**
- AWS (AssumeRole only - no customer keys stored)
- Azure (Activity logs, storage, NSG rules)
- GCP (Log sinks, GCS, firewall rules, service accounts)

**AWS Security Checks:**
- IAM (MFA, stale access keys)
- CloudTrail logging
- S3 (public access, encryption)
- GuardDuty
- Security groups
- Daily scheduled scans via BullMQ

**Security Model:**
- Uses AWS AssumeRole with external ID
- Vikela platform credentials only for AssumeRole
- Never stores customer AWS keys
- CloudFormation template for customer setup

### 3. Identity Provider Scanning (Phase 4)

**Supported Providers:**
- Okta (OAuth + API)
- Azure AD (OAuth)
- Google Workspace (OAuth)
- JumpCloud (API key)
- Auth0 (stub)

**Security Checks:**
- MFA enforcement
- Inactive user detection
- Conditional access policies
- Daily scheduled scans

### 4. AI Copilot (Phase 6)

**Features:**
- RAG (Retrieval-Augmented Generation) over gaps, controls, policies
- Persistent conversation threads per organization
- Streaming responses via SSE
- Gap-specific explanations
- Smart suggestions from open findings
- Source citations for answers
- Knowledge reindexing

**API Endpoints:**
- `POST /api/v1/copilot/chat/stream` - Stream chat
- `POST /api/v1/copilot/explain-gap/:id` - Explain specific gap
- `POST /api/v1/copilot/reindex` - Reindex knowledge

### 5. Evidence Management (Phase 7)

**Evidence Locker:**
- File uploads (10MB limit)
- Link to SOC 2 controls
- Coverage dashboard (% of controls with evidence)
- Auto-collect from gaps
- Metadata editing
- Auto-reindex copilot knowledge

**Policy Generator:**
- AI-powered policy drafting
- Pre-filled with org name + open gaps
- SOC 2 bundle generation (6 core policies)
- Draft → Review → Approve → Publish workflow
- Markdown export
- Inline editor with AI regeneration

### 6. Multi-Cloud & Full Scanning (Phase 8)

**Features:**
- Multi-tenant organization context
- Clerk webhook integration
- Azure/GCP cloud scanners
- Full compliance scan (code + cloud + identity)
- 3-step onboarding wizard

---

## Database Schema

### Core Models

**Organization:**
- Multi-tenant root entity
- Links to Clerk via `clerkOrgId`
- Plan management (FREE, STARTER, GROWTH, ENTERPRISE)
- Stripe integration for billing
- Settings stored as JSON

**Integration:**
- Encrypted tokens (AES-256-GCM)
- Supports Git, Cloud, Identity, Observability providers
- OAuth tokens with refresh support
- Webhook secrets
- Metadata for provider-specific data

**Repository:**
- Connected to Git integrations
- Scan history
- Gap tracking
- Branch and commit tracking

**CloudAccount:**
- Connected to Cloud integrations
- Multi-environment support (PRODUCTION, STAGING, DEVELOPMENT)
- Scan history
- Gap tracking

**Framework:**
- Compliance frameworks (SOC 2, ISO 27001, etc.)
- Control definitions
- Organization enrollment tracking

**Control:**
- Individual compliance requirements
- Mapped to frameworks
- Auto-satisfaction rules
- Test procedures

**Gap:**
- Compliance violations found during scans
- Multiple sources (CODE, IAM, NETWORK, etc.)
- Severity levels (CRITICAL, HIGH, MEDIUM, LOW, INFO)
- Remediation guidance
- Status tracking (OPEN, IN_PROGRESS, RESOLVED, ACCEPTED)

**Evidence:**
- Audit documentation
- Linked to controls
- Multiple types (SCREENSHOT, LOG, EXPORT, POLICY, etc.)
- Auto-collected from gaps

**Policy:**
- Compliance policies
- AI-generated content
- Version tracking
- Approval workflow

**CopilotThread:**
- AI conversation history
- Message storage with citations
- Organization-scoped

**KnowledgeChunk:**
- RAG knowledge base
- Embeddings for semantic search
- Source tracking (gaps, controls, policies)

### Key Relationships

- Organization → Members (many-to-many via Member)
- Organization → Integrations (one-to-many)
- Organization → Repositories (one-to-many via Integration)
- Organization → CloudAccounts (one-to-many via Integration)
- Organization → Frameworks (many-to-many via OrgFramework)
- Organization → Controls (many-to-many via OrgControl)
- Integration → Repositories (one-to-many)
- Integration → CloudAccounts (one-to-many)
- Scan → Gaps (one-to-many)
- Gap → Control (many-to-one)
- Evidence → Control (many-to-one)

---

## API Structure

### Authentication

**Clerk Integration:**
- JWT verification via `@clerk/fastify`
- Session validation middleware
- Role-based access control (OWNER, ADMIN, MEMBER, AUDITOR)
- Demo mode fallback for development

**API Keys:**
- Organization-scoped API keys
- Hashed storage
- Usage tracking

### Key Endpoints

**Dashboard & Overview:**
- `GET /api/v1/dashboard` - Unified posture score
- `GET /api/v1/org` - Current organization info

**Integrations:**
- `GET /api/v1/integrations` - All provider statuses
- `POST /api/v1/integrations/:provider/connect` - Connect provider
- `DELETE /api/v1/integrations/:id` - Disconnect provider

**Repositories:**
- `GET /api/v1/repositories` - List connected repos
- `POST /api/v1/repositories/:id/scan` - Queue code scan
- `GET /api/v1/repositories/:id/gaps` - Get repo gaps

**Cloud Accounts:**
- `GET /api/v1/cloud-accounts` - List cloud accounts
- `POST /api/v1/cloud-accounts/:id/scan` - Queue cloud scan
- `GET /api/v1/cloud-accounts/:id/gaps` - Get cloud gaps

**Scanning:**
- `POST /api/v1/scans/code/:repoId` - Run code scanner
- `POST /api/v1/scans/full` - Full compliance scan
- `GET /api/v1/scans/:id` - Get scan status

**Gaps:**
- `GET /api/v1/gaps` - List gaps with filters
- `GET /api/v1/gaps/:id` - Get gap details
- `PATCH /api/v1/gaps/:id` - Update gap status

**Evidence:**
- `GET /api/v1/evidence` - List evidence
- `POST /api/v1/evidence` - Upload evidence
- `GET /api/v1/evidence/coverage` - Coverage dashboard
- `POST /api/v1/evidence/collect-from-gaps` - Auto-collect from gaps

**Policies:**
- `GET /api/v1/policies` - List policies
- `POST /api/v1/policies` - Create policy
- `POST /api/v1/policies/generate-bundle` - Generate SOC 2 bundle
- `POST /api/v1/policies/:id/publish` - Publish to evidence

**AI Copilot:**
- `POST /api/v1/copilot/chat/stream` - Stream chat (SSE)
- `POST /api/v1/copilot/explain-gap/:id` - Explain gap
- `GET /api/v1/copilot/threads` - List threads
- `POST /api/v1/copilot/reindex` - Reindex knowledge

**Webhooks:**
- `POST /api/v1/webhooks/github` - GitHub webhook
- `POST /api/v1/webhooks/gitlab` - GitLab webhook
- `POST /api/v1/webhooks/clerk` - Clerk webhook

### Rate Limiting

- Configurable via `API_RATE_LIMIT_MAX` (default: 300)
- Per-organization limits
- IP-based fallback

---

## Frontend Structure

### App Router Structure

**Public Routes:**
- `/` - Marketing landing page
- `/sign-in` - Clerk sign-in
- `/sign-up` - Clerk sign-up

**Authenticated Routes:**
- `/dashboard` - Main compliance dashboard
- `/gaps` - Gap management
- `/frameworks` - Framework enrollment
- `/controls` - Control tracking
- `/evidence` - Evidence locker
- `/policies` - Policy management
- `/integrations` - Integration management
- `/settings` - Account settings
- `/onboarding` - New user onboarding

### Key Components

**Dashboard:**
- Posture score visualization
- Gap summary by severity
- Recent scans
- Framework progress

**Integrations:**
- Provider connection modals
- OAuth flow handling
- Status indicators
- Scan triggers

**Evidence:**
- File upload interface
- Coverage matrix
- Control filtering
- Auto-collect from gaps

**Policies:**
- Markdown editor
- AI generation
- Approval workflow
- Bundle generation

**AI Copilot:**
- Chat interface
- Thread history
- Streaming responses
- Source citations

---

## Environment Configuration

### Required Variables

**Core Application:**
```bash
NODE_ENV=development
APP_URL=http://localhost:3000
API_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3001
ENCRYPTION_KEY=  # Generate with: openssl rand -hex 32
```

**Database:**
```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/vikela
DIRECT_URL=  # For Supabase pooler
REDIS_URL=redis://localhost:6379
```

**Authentication:**
```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=
ALLOW_DEMO_INTEGRATIONS=true  # Dev only
```

### Optional Variables

**AI Features:**
```bash
ANTHROPIC_API_KEY=  # Required for AI features
OPENAI_API_KEY=
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

**Git Providers:**
```bash
GITHUB_APP_ID=
GITHUB_APP_PRIVATE_KEY=
GITHUB_WEBHOOK_SECRET=
GITLAB_APP_ID=
GITLAB_APP_SECRET=
BITBUCKET_CLIENT_ID=
BITBUCKET_CLIENT_SECRET=
```

**Cloud Scanning:**
```bash
AWS_VIKELA_ACCOUNT_ID=
AWS_VIKELA_ACCESS_KEY_ID=
AWS_VIKELA_SECRET_ACCESS_KEY=
AWS_EXTERNAL_ID=vikela-scanner
CLOUD_SCAN_CRON=0 2 * * *
AZURE_TENANT_ID=
AZURE_CLIENT_ID=
AZURE_CLIENT_SECRET=
GCP_CLIENT_ID=
GCP_CLIENT_SECRET=
```

**Identity Scanning:**
```bash
OKTA_CLIENT_ID=
OKTA_CLIENT_SECRET=
AZURE_AD_TENANT_ID=
GOOGLE_WORKSPACE_CLIENT_ID=
IDENTITY_SCAN_CRON=0 3 * * *
```

**Storage:**
```bash
AWS_S3_ACCESS_KEY_ID=
AWS_S3_SECRET_ACCESS_KEY=
AWS_S3_REGION=us-east-1
AWS_S3_BUCKET=vikela-evidence
```

**Billing:**
```bash
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_STARTER=
STRIPE_PRICE_GROWTH=
```

**Observability:**
```bash
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
POSTHOG_API_KEY=
NEXT_PUBLIC_POSTHOG_KEY=
```

---

## What's Required to Make It Work

### 1. Infrastructure Setup

**Local Development:**
```bash
# Start required services
docker compose up -d postgres redis

# Generate encryption key
openssl rand -hex 32

# Setup database
npm run db:generate
npm run db:push
npm run db:seed
```

**Production Deployment:**
- PostgreSQL database with pgvector extension
- Redis instance for BullMQ
- S3-compatible storage for evidence files
- Domain names for web and API

### 2. Authentication Setup

**Option A: Clerk (Recommended for Production)**
1. Create Clerk account at clerk.com
2. Create application
3. Configure JWT templates
4. Set up webhook for organization sync
5. Add environment variables

**Option B: Demo Mode (Development Only)**
```bash
ALLOW_DEMO_INTEGRATIONS=true
VIKELA_DEV_ORG_SLUG=demo
```

### 3. Third-Party Integrations

**GitHub App (Required for Code Scanning):**
1. Create GitHub App
2. Generate private key
3. Configure webhook URL
4. Set permissions
5. Add environment variables

**AWS AssumeRole (Required for Cloud Scanning):**
1. Create IAM role in Vikela AWS account
2. Configure trust relationship with external ID
3. Add Vikela platform credentials
4. Provide CloudFormation template to customers

**AI Features (Optional but Recommended):**
1. Get Anthropic API key
2. Add `ANTHROPIC_API_KEY` to environment
3. Configure embedding model if using OpenAI

### 4. Database Migration

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Or use migrations for production
npm run db:migrate
```

### 5. Dependency Installation

```bash
# Install all dependencies
npm install

# Install new testing dependencies (added but not installed)
npm install  # This will install the testing packages added to package.json
```

### 6. Security Vulnerabilities

**Current npm audit vulnerabilities (4):**
1. `@fastify/static` (moderate) - Path traversal and route guard bypass
2. `esbuild` (high) - Binary integrity verification and arbitrary file read
3. `js-cookie` (high) - Prototype hijack in assign()
4. `@clerk/shared` - Depends on vulnerable js-cookie

**Fix:**
```bash
npm audit fix              # Fix non-breaking changes
npm audit fix --force      # Fix all (may include breaking changes)
```

---

## Known Issues and Limitations

### 1. Testing Dependencies Not Installed

**Issue:** New testing dependencies added to package.json but not installed:
- `c8` - Code coverage
- `eslint-plugin-security` - Security linting
- `eslint-plugin-jsx-a11y` - Accessibility linting
- `eslint-plugin-react` - React linting
- `@stryker-mutator/*` - Mutation testing
- Jest and related packages for web app testing
- `@axe-core/playwright` - Accessibility testing

**Impact:** Advanced testing features not available
**Fix:** Run `npm install`

### 2. Security Vulnerabilities

**Issue:** 4 npm audit vulnerabilities in dependencies
**Impact:** Potential security risks
**Fix:** Run `npm audit fix` or `npm audit fix --force`

### 3. Demo Mode Only

**Issue:** Currently configured for demo mode without Clerk
**Impact:** Multi-tenant features not fully tested
**Fix:** Configure Clerk for production use

### 4. Missing Production Configuration

**Issue:** Many environment variables not set for production
**Impact:** Cloud scanning, AI features, and integrations won't work
**Fix:** Configure all required environment variables

### 5. Evidence Storage Not Configured

**Issue:** S3 credentials not configured
**Impact:** File uploads won't work
**Fix:** Configure AWS S3 or compatible storage

---

## Deployment Guide

### Local Development

```bash
# 1. Clone repository
git clone <repo-url>
cd vikela

# 2. Copy environment file
cp .env.example .env

# 3. Generate encryption key
openssl rand -hex 32  # Add to ENCRYPTION_KEY in .env

# 4. Start services
docker compose up -d postgres redis

# 5. Install dependencies
npm install

# 6. Setup database
npm run db:generate
npm run db:push
npm run db:seed

# 7. Start applications
npm run dev  # Starts both API (:3001) and Web (:3000)

# 8. Access applications
# Web: http://localhost:3000
# API: http://localhost:3001
# Dashboard: http://localhost:3000/dashboard
```

### Railway Deployment

See `RAILWAY_DEPLOYMENT.md` for detailed instructions.

**Summary:**
1. Create Railway project
2. Add PostgreSQL and Redis services
3. Deploy API service (apps/api)
4. Deploy Web service (apps/web)
5. Configure environment variables
6. Run database migrations
7. Configure Clerk webhooks
8. Test deployment

**Estimated Cost:** $30-50/month for production

---

## Testing Strategy

### Current Test Coverage

**API Tests:**
- 81 unit tests passing
- Tests for utilities, services, and helpers
- Node.js built-in test runner
- Located in `apps/api/src/__tests__/`

**Web Tests:**
- Jest configuration added
- React Testing Library configured
- Component test files created but dependencies not installed
- Located in `apps/web/__tests__/` and component directories

**E2E Tests:**
- Playwright configured
- Tests for smoke, integration, accessibility, security, UAT, regression, localization, contract
- Located in `e2e/`

**Performance Tests:**
- K6 scripts for load, stress, volume testing
- Located in `performance/`

### Running Tests

```bash
# API unit tests (working)
npm run test

# Linting (working)
npm run lint

# Complete test suite (working)
npm run test:all

# Web tests (requires npm install)
npm run test -w @vikela/web

# E2E tests (requires services running)
npm run test:e2e

# Performance tests (requires k6 installation)
npm run test:performance
```

### Test Documentation

- `docs/TESTING_STRATEGY.md` - Comprehensive testing strategy
- `docs/TESTING_GUIDE.md` - Developer testing guide
- `docs/TESTING_SETUP.md` - Setup instructions

---

## Monitoring and Observability

### Current Setup

**Sentry:**
- Error tracking configured
- Environment variables: `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`
- Not currently configured

**PostHog:**
- Analytics and product analytics
- Environment variables: `POSTHOG_API_KEY`, `NEXT_PUBLIC_POSTHOG_KEY`
- Not currently configured

### Health Checks

**API:**
- Endpoint: `/health`
- Returns: `{ status: "ok" }`
- Used by Railway for service health

**Web:**
- Endpoint: `/`
- Next.js health check
- Used by Railway for service health

---

## Billing and Plans

### Plan Structure

**Plans:**
- FREE - Basic features
- STARTER - Enhanced features
- GROWTH - Advanced features
- ENTERPRISE - Custom features

### Stripe Integration

**Configuration:**
- `STRIPE_SECRET_KEY` - Stripe API key
- `STRIPE_WEBHOOK_SECRET` - Webhook verification
- `STRIPE_PRICE_STARTER` - Starter plan price ID
- `STRIPE_PRICE_GROWTH` - Growth plan price ID

**Implementation:**
- Organization model includes `stripeCustomerId` and `stripeSubscriptionId`
- Webhook endpoint for subscription events
- Plan enforcement in API middleware

---

## Security Considerations

### Encryption

**Token Storage:**
- Integration tokens encrypted with AES-256-GCM
- `ENCRYPTION_KEY` required for token encryption/decryption
- Never store plaintext tokens

**AWS Security:**
- AssumeRole only - no customer keys stored
- External ID for cross-account role assumption
- Vikela platform credentials for AssumeRole only

### Authentication

**Clerk:**
- JWT-based authentication
- Role-based access control
- Session management
- Webhook for organization sync

**API Keys:**
- Organization-scoped
- Hashed storage
- Usage tracking
- Revocation support

### Rate Limiting

- Configurable per-organization limits
- IP-based fallback
- Prevents abuse

### CORS

- Configurable allowed origins
- `CORS_ALLOWED_ORIGINS` environment variable
- Protects against CSRF

---

## Performance Considerations

### Database

**Indexes:**
- Strategic indexes on frequently queried fields
- Composite indexes for complex queries
- Consider query performance when adding new indexes

**Connection Pooling:**
- Prisma connection pooling
- Supabase pooler support via `DIRECT_URL`

### Job Queue

**BullMQ:**
- Async job processing for scans
- Redis-backed
- Scheduled jobs for daily scans
- Worker can be disabled via `DISABLE_SCAN_WORKER`

### Caching

**React Query:**
- Client-side caching
- Stale-while-revalidate strategy
- Optimistic updates

---

## Development Workflow

### Branching Strategy

- `main` - Production
- `develop` - Development
- Feature branches from `develop`

### Code Quality

**Linting:**
- ESLint for both API and Web
- TypeScript strict mode
- Prettier for formatting

**Testing:**
- Unit tests for utilities and services
- Integration tests for API endpoints
- E2E tests for critical user flows
- 81 API tests currently passing

### Database Changes

**Workflow:**
1. Modify `schema.prisma`
2. Run `npm run db:generate` to update client
3. Run `npm run db:push` for development
4. Create migration for production: `npm run db:migrate:dev`

---

## Troubleshooting

### Common Issues

**Database Connection:**
```bash
# Check PostgreSQL is running
docker compose ps postgres

# Restart database
docker compose restart postgres

# Recreate database
docker compose down -v
docker compose up -d postgres
npm run db:local
```

**Redis Connection:**
```bash
# Check Redis is running
docker compose ps redis

# Restart Redis
docker compose restart redis
```

**Port Conflicts:**
```bash
# Kill processes on ports 3000 and 3001
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9
```

**Build Errors:**
```bash
# Clear cache
rm -rf .turbo node_modules/.cache

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Debug Mode

**API:**
```bash
# Run with tsx watch for hot reload
npm run dev -w @vikela/api
```

**Web:**
```bash
# Run Next.js dev server
npm run dev -w @vikela/web
```

---

## Next Steps for New Developer

### Immediate Actions

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Setup Environment:**
   ```bash
   cp .env.example .env
   openssl rand -hex 32  # Add to ENCRYPTION_KEY
   ```

3. **Start Services:**
   ```bash
   docker compose up -d postgres redis
   npm run db:local
   ```

4. **Run Application:**
   ```bash
   npm run dev
   ```

5. **Verify Setup:**
   - Visit http://localhost:3000
   - Visit http://localhost:3001/health
   - Run tests: `npm run test`

### Learning Path

1. **Understand Data Model:**
   - Read `apps/api/prisma/schema.prisma`
   - Understand relationships between models

2. **Explore API:**
   - Read `apps/api/src/index.ts` for entry point
   - Explore `apps/api/src/routes/` for endpoints
   - Review `apps/api/src/services/` for business logic

3. **Explore Frontend:**
   - Read `apps/web/app/layout.tsx` for structure
   - Explore `apps/web/app/(app)/` for pages
   - Review components in `apps/web/components/`

4. **Understand Integrations:**
   - Review `apps/api/src/services/git/` for Git providers
   - Review `apps/api/src/services/cloud/` for Cloud providers
   - Review `apps/api/src/services/identity/` for Identity providers

5. **Review Testing:**
   - Read `docs/TESTING_STRATEGY.md`
   - Run existing tests
   - Add new tests for features

### Recommended Reading

1. `README.md` - Project overview
2. `RAILWAY_DEPLOYMENT.md` - Deployment guide
3. `docs/TESTING_STRATEGY.md` - Testing strategy
4. `docs/TESTING_GUIDE.md` - Testing guide
5. `docs/TESTING_SETUP.md` - Testing setup

---

## Contact and Support

### Documentation

- Project README: `README.md`
- Deployment Guide: `RAILWAY_DEPLOYMENT.md`
- Testing Documentation: `docs/`

### External Resources

- Clerk Documentation: https://clerk.com/docs
- Prisma Documentation: https://www.prisma.io/docs
- Fastify Documentation: https://fastify.dev/docs
- Next.js Documentation: https://nextjs.org/docs
- BullMQ Documentation: https://docs.bullmq.io

---

## Summary

Vikela is a well-architected compliance automation platform with comprehensive features for code, cloud, and identity scanning. The application is functional for development with demo mode but requires proper configuration for production deployment.

**Key Strengths:**
- Comprehensive compliance scanning capabilities
- AI-powered assistance with Claude
- Multi-tenant architecture
- Strong security model (encryption, AssumeRole)
- Modern tech stack (Next.js, Fastify, Prisma)
- Comprehensive testing strategy

**What's Missing for Production:**
- Clerk authentication configuration
- Third-party integration credentials (GitHub, AWS, etc.)
- S3 storage for evidence files
- Production environment variables
- Security vulnerability fixes
- Testing dependency installation
- Observability configuration (Sentry, PostHog)

**Estimated Time to Production:**
- 2-4 hours for basic deployment with demo mode
- 1-2 days for full production setup with all integrations

---

**End of Handover Report**
