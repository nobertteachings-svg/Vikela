# Vikela

**Protect. Shield. Comply.** — Universal compliance engine for startups.

Automate SOC 2, ISO 27001, HIPAA, GDPR, and ISO 42001 by scanning **code + cloud + identity** across GitHub/GitLab/Bitbucket, AWS/Azure/GCP, and Okta/Azure AD/Google Workspace.

## Architecture

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

Every external platform connects via the `Integration` model with **AES-256-GCM encrypted tokens**. AWS uses **AssumeRole only** — no customer long-lived keys.

## Quick start

```bash
cp .env.example .env
# Set ENCRYPTION_KEY: openssl rand -hex 32

docker compose up -d
npm install
HOME=$PWD/.home XDG_CACHE_HOME=$PWD/.cache npm run db:push
HOME=$PWD/.home npm run db:seed

npm run dev -w @vikela/api   # :3001
npm run dev -w @vikela/web   # :3000
```

- **Dashboard:** http://localhost:3000/dashboard
- **Integrations:** http://localhost:3000/integrations

## User guide

End-user documentation for org admins and operators (sign-up, integrations, frameworks, evidence, billing, and more):

- **[docs/user-guide/](./docs/user-guide/README.md)** — index and how Vikela fits together
- [Getting started](./docs/user-guide/getting-started.md)
- [Integrations](./docs/user-guide/integrations/README.md) — per-provider connect how-tos

Developer handover and ops docs remain under [`docs/`](./docs/) (e.g. `DEVELOPER_HANDOVER.md`, `PRODUCTION_SETUP.md`).

## Railway deployment

For cloud deployment, see [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md) for complete instructions on deploying to Railway with PostgreSQL, Redis, and multi-service architecture.

## Demo data (seed)

| Integration | Status | Resources |
|-------------|--------|-----------|
| GitHub | Connected | 1 repo (`acme/backend`) |
| AWS | Connected (AssumeRole) | 1 cloud account |
| Azure AD | Connected | Identity |

**8 gaps** — 4 code + 4 cloud (IAM, S3, CloudTrail, security group)

## Phase 3 — AWS Cloud Scanner ✅

- **AssumeRole only** — never stores customer AWS keys
- Checks: **IAM** (MFA, stale access keys), **CloudTrail**, **S3** (public access, encryption), **GuardDuty**, **security groups**
- CloudFormation template: `GET /api/v1/aws/cloudformation-template`
- Connect: `POST /api/v1/integrations/aws/connect` with Role ARN
- **Daily scheduled scans** via BullMQ (`CLOUD_SCAN_CRON`, default 2am)

```bash
# Vikela platform credentials (your AWS account used only to AssumeRole into customers)
AWS_VIKELA_ACCESS_KEY_ID=
AWS_VIKELA_SECRET_ACCESS_KEY=
AWS_VIKELA_ACCOUNT_ID=
AWS_EXTERNAL_ID=vikela-scanner

# Scan cloud account
curl -X POST http://localhost:3001/api/v1/cloud-accounts/{id}/scan -d '{"async":true}'
```

UI: **Settings → Integrations → AWS** (modal) · **Settings → Cloud Accounts → Scan now**

## Phase 4 — Identity Providers ✅

- **Okta**, **Azure AD**, **Google Workspace** with OAuth + compliance scans (MFA, inactive users, CA policies)
- **JumpCloud** API key connect · **Auth0** stub
- **Settings → Identity → Scan now** · daily `IDENTITY_SCAN_CRON`

## Phase 6 — AI Copilot ✅

Claude-powered compliance assistant with **RAG** over gaps, controls, policies, and evidence.

- **Persistent threads** — conversation history per org
- **Streaming responses** — SSE at `POST /api/v1/copilot/chat/stream`
- **Gap-aware Q&A** — `POST /api/v1/copilot/explain-gap/:id` or **Gaps → Ask Copilot**
- **Smart suggestions** — generated from your open findings
- **Source citations** — RAG chunks shown on each answer
- **Knowledge reindex** — `POST /api/v1/copilot/reindex`

```bash
# Stream chat
curl -N -X POST http://localhost:3001/api/v1/copilot/chat/stream \
  -H "Content-Type: application/json" \
  -H "X-Org-Slug: demo" \
  -d '{"message":"Why did we fail CC6.1?"}'

# Explain a specific gap
curl -X POST http://localhost:3001/api/v1/copilot/explain-gap/{gapId} \
  -H "X-Org-Slug: demo"
```

UI: **AI Copilot** (sidebar) · thread history · live streaming

Set `ANTHROPIC_API_KEY` for full Claude responses (demo fallback without it).

## Phase 7 — Evidence + Policies ✅

Audit-ready **Evidence Locker** and AI **Policy Generator** with coverage tracking.

### Evidence Locker
- Upload files (10MB) · link to SOC 2 controls · filter by control
- **Coverage dashboard** — % of controls with evidence
- **Auto-collect from gaps** — turn scanner findings into evidence records
- PATCH metadata · auto-reindex copilot knowledge

### Policy Generator
- AI drafts pre-filled with org name + open gaps (`ANTHROPIC_API_KEY`)
- **Generate SOC 2 bundle** — 6 core policies in one click
- Workflow: Draft → Review → Approve → **Publish** (files to Evidence locker)
- Markdown export · inline editor · regenerate with AI

```bash
# Evidence coverage
curl http://localhost:3001/api/v1/evidence/coverage -H "X-Org-Slug: demo"

# Auto-collect evidence from open gaps
curl -X POST http://localhost:3001/api/v1/evidence/collect-from-gaps -H "X-Org-Slug: demo"

# Generate policy bundle
curl -X POST http://localhost:3001/api/v1/policies/generate-bundle \
  -H "Content-Type: application/json" -H "X-Org-Slug: demo" \
  -d '{"industry":"SaaS","employeeCount":"10-50"}'

# Publish policy → evidence locker
curl -X POST http://localhost:3001/api/v1/policies/{id}/publish -H "X-Org-Slug: demo"
```

UI: **Evidence** (coverage matrix) · **Policies** (editor + bundle)

## Phase 8 — Multi-tenant + Azure/GCP + Full Scan ✅

- **Org context** — API resolves tenant via `X-Org-Slug` or `X-Clerk-Org-Id` (demo fallback)
- **Clerk webhook** — `POST /api/v1/webhooks/clerk` syncs `organization.created` → Vikela org + SOC 2 controls
- **Azure cloud scanner** — Activity logs, storage public access, NSG rules (ARM API)
- **GCP cloud scanner** — Log sinks, GCS public access, firewall rules, service accounts
- **Full scan** — `POST /api/v1/scans/full` runs code + all cloud accounts + identity integrations
- **Onboarding wizard** — 3-step Git → Cloud → Identity at `/onboarding`

```bash
# Full compliance scan (async)
curl -X POST http://localhost:3001/api/v1/scans/full \
  -H "Content-Type: application/json" \
  -H "X-Org-Slug: demo" \
  -d '{"async":true}'

# Current org
curl http://localhost:3001/api/v1/org -H "X-Org-Slug: demo"
```

Connect Azure/GCP: **Settings → Integrations** (demo connect without OAuth, or configure client IDs for live OAuth).

## Phase 2 — Git + Code Scanner

- GitHub App install + OAuth (`/api/v1/auth/github/*`)
- GitLab + Bitbucket OAuth + webhooks
- Code scanner: secrets, encryption, deps, access, logging
- Claude remediation per finding (`ANTHROPIC_API_KEY`)
- PR/MR review comments on GitHub
- BullMQ async scans on `push` and `pull_request`

**GitHub App:** Setup + Callback URL → `http://localhost:3000/api/auth/github/callback` (web app proxies to the API) · Webhook → `http://localhost:3001/api/v1/webhooks/github` (use ngrok locally). App must be **public** for customer install.

**Scan a repo:** Settings → Repositories → **Scan now**, or:

```bash
curl -X POST http://localhost:3001/api/v1/repositories/{repoId}/scan -H "Content-Type: application/json" -d '{"async":true}'
```

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/dashboard` | Unified posture score |
| GET | `/api/v1/integrations` | All provider statuses |
| GET | `/api/v1/auth/github/install` | Start GitHub App install |
| POST | `/api/v1/webhooks/github` | GitHub webhook receiver |
| GET | `/api/v1/repositories` | List connected repos |
| POST | `/api/v1/repositories/:id/scan` | Queue code scan |
| GET | `/api/v1/gaps?source=CODE` | Filter gaps by source |
| POST | `/api/v1/scans/code/:repoId` | Run code scanner |

## YC demo path

**Week 1:** GitHub connected → real repo scan → 3–5 code gaps  
**Week 2:** Add AWS cloud gaps + copilot explanation

## Project structure

See build prompt for full tree. Key paths:

- `apps/api/src/services/git/` — IGitProvider + GitHub/GitLab/Bitbucket
- `apps/api/src/services/cloud/` — ICloudProvider + AWS/Azure/GCP
- `apps/api/src/services/scanner/` — Code + cloud scan orchestration
- `apps/api/src/services/copilot/` — RAG context, threads, Claude chat + stream
- `apps/api/src/services/evidence/` — coverage, auto-collect from gaps
- `apps/api/src/services/policy/` — generator, bundle, publish to evidence
- `apps/web/components/integrations/` — Provider tiles UI

## License

Proprietary — Vikela © 2026
