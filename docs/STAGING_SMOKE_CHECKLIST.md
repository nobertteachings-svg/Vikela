# Staging Smoke Checklist

**Purpose:** Verify the full product loop on staging before any external session (design partner, demo, paid beta).  
**Do not write the demo script until this checklist is complete**: the script will reference real staging URLs and a real gap ID from the member flow below.

**Pass criteria (all required):** one completed scan · one resolved gap · dashboard numbers change · auditor can export · webhook HMAC validates, **all on staging, no local fallbacks**.

> **Hard dependency. Clerk first.** If staging Clerk is blocked (no app, no `org:auditor` role, no webhook endpoint registered), unblock that before anything else. The entire **auditor flow** section is untestable without it.

---

## Staging URLs (fill in before starting)

| Key | Value |
|-----|-------|
| **Web URL** | `https://________________.vercel.app` |
| **API URL** | `https://________________.up.railway.app` |
| **Clerk instance** | `https://dashboard.clerk.com/..` |
| **PostHog project** | `https://app.posthog.com/project/____` |
| **Smoke tester (member)** | `________________@________` |
| **Smoke tester (auditor)** | `auditor@test.com` (or your inbox) |
| **Gap ID (from member flow)** | `________________` ← fill after step 2.10 |
| **Completed scan ID** | `________________` ← fill after step 2.2 |
| **Date run** | `________________` |
| **Run by** | `________________` |

---

## Results summary

| Section | Pass | Fail | Notes |
|---------|:----:|:----:|-------|
| 1. Environment setup | ☐ | ☐ | |
| 2. Member flow | ☐ | ☐ | |
| 3. Auditor flow | ☐ | ☐ | |
| 4. Webhooks | ☐ | ☐ | |
| 5. Notifications | ☐ | ☐ | |
| 6. PostHog | ☐ | ☐ | |
| **Overall gate** | ☐ | ☐ | All sections must pass |

**When you come back, bring:** pass/fail per section · staging web + API URLs · real gap ID · real scan ID · anything red (fix queue before demo script). **Green sheet → demo script.**

---

## 1. Environment setup

Complete this section before running user flows.

### 1.1 Clerk

- [ ] Staging Clerk app created (or dedicated dev instance) with **Organizations** enabled
- [ ] Custom role **`org:auditor`** created: **Organizations → Roles** (Clerk key must be exactly `org:auditor`, maps to Shieldoq `AUDITOR` in DB)
- [ ] **Web env:** `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` set on Vercel preview/production
- [ ] **API env:** `CLERK_SECRET_KEY` set on Railway
- [ ] **API env:** `CLERK_WEBHOOK_SECRET` set (from Clerk webhook endpoint)
- [ ] Clerk webhook endpoint registered:
  - **URL:** `{API_URL}/api/v1/webhooks/clerk`
  - **Subscribe to:** `organization.created`, `organization.updated`, `organizationMembership.created`, `organizationMembership.updated`, `organizationMembership.deleted`
- [ ] After first org signup, confirm org appears in DB (`Organization.clerkOrgId` populated), webhook sync working

### 1.2 Railway (API)

- [ ] API deployed and healthy: `GET {API_URL}/health` → `{ "status": "ok", "service": "shieldoq-api" }`
- [ ] Required env vars set:

| Variable | Required | Notes |
|----------|:--------:|-------|
| `NODE_ENV` | ✓ | `production` |
| `DATABASE_URL` | ✓ | Postgres (migrations applied) |
| `REDIS_URL` | ✓ | Scan worker needs BullMQ |
| `ENCRYPTION_KEY` | ✓ | `openssl rand -hex 32` |
| `CLERK_SECRET_KEY` | ✓ | |
| `CLERK_WEBHOOK_SECRET` | ✓ | |
| `APP_URL` | ✓ | **Web URL**: used in email links |
| `CORS_ALLOWED_ORIGINS` | ✓ | **Web URL** (comma-separate if multiple previews) |
| `RESEND_API_KEY` | ✓ | For notification smoke |
| `RESEND_FROM_EMAIL` | ✓ | Verified domain in Resend |
| `POSTHOG_API_KEY` | ✓ | Server-side product events |
| `POSTHOG_HOST` | ✓ | e.g. `https://app.posthog.com` |
| `AWS_S3_*` + `AWS_S3_BUCKET` | ○ | Evidence export with files; export still works without S3 but `files/` may be empty |
| `ANTHROPIC_API_KEY` | ✓ | **Required for real Copilot answers** (without it, API returns canned demo text) |
| `OPENAI_API_KEY` | ✓ | **Required for vector RAG** (without it, keyword fallback only) |
| `GITHUB_*` (or GL/BB) | ○ | If testing repo connect in onboarding |

- [ ] `DISABLE_SCAN_WORKER` is **not** set (worker must run for lite scan)
- [ ] **Migrations applied** on staging DB (includes `Scan.parentScanId`):
  ```bash
  cd apps/api && npx prisma migrate deploy
  ```
- [ ] GitHub (or GL/BB) OAuth redirect URIs point at **Web URL** if testing connect flow

### 1.3 Vercel (Web)

- [ ] Web deployed; loads without API errors
- [ ] `NEXT_PUBLIC_API_URL` → **API URL**
- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` matches Clerk staging app
- [ ] `NEXT_PUBLIC_POSTHOG_KEY` + `NEXT_PUBLIC_POSTHOG_HOST` set (PostHog section)
- [ ] `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding/connect-repos` (or your chosen entry)

---

## 2. Member flow

Run as a **new org owner** (fresh signup or dedicated smoke org).

- [ ] **2.1** Sign up at `/sign-up` → lands on `/onboarding/connect-repos`
- [ ] **2.2** Connect GitHub (or skip) → `/onboarding/scan` → lite scan **completes** (note **scan ID** in `/scans` or network tab)
- [ ] **2.3** Dashboard shows non-zero posture score (after scan), severity bar, framework readiness bars
- [ ] **2.4** **`/frameworks`**: if SOC 2 is not auto-enrolled, click **Enable framework** on SOC 2 → **Enabled** chip appears (Clerk webhook usually auto-enrolls; verify at least one path works)
- [ ] **2.5** **`/gaps?framework=soc2`**: severity chips **match the filtered table** (not org-wide totals)
- [ ] **2.6** **`/controls?framework=soc2`**: derived status shows correctly (e.g. **Needs review** / **Implemented** after scan, not all **Not started**)
- [ ] **2.7** On controls list, click **gap count** on a control with open gaps → **`/gaps?control={code}`** → severity chips **match the filtered table**
- [ ] **2.8** Open **`/controls/{code}`** (e.g. `CC6.1`) → **View all** / open-gaps link → **`/gaps?control={code}`** → filtered list matches detail
- [ ] **2.9** Open a gap from a filtered list → detail loads with **GapStatusActions** (status dropdown + Mark resolved)
- [ ] **2.10** **Mark resolved** on a gap **mapped to a SOC 2 control** (`controlCode` visible, e.g. `CC6.1`) → redirects to `/gaps` → gap gone from **Open** tab (note **gap ID** before resolve)
- [ ] **2.11** **`/gaps`**: switch to **Resolved** tab → gap from **2.10** appears with **resolvedAt** timestamp (desc sort)
- [ ] **2.12** Dashboard **Findings by source** → click **Cloud** card → `/gaps` opens with cloud sources pre-selected (toolbar **Cloud (all)**; list matches cloud bucket only)
- [ ] **2.13** **`/gaps` Open** tab → severity filter to a level with **zero** matches (e.g. Critical if none) → filter-aware empty state (*"Nothing matches your filters…"*, not the clean-org copy)
- [ ] **2.14** **`/frameworks`**: SOC 2 **Readiness %** increased vs step 2.4 (requires control-mapped gap resolved in **2.10**)
- [ ] **2.15** Dashboard **Controls met** count moved (may need framework with gap-mapped controls)
- [ ] **2.16** Scan-complete email lands in inbox (check spam), see §5 if skipped here
- [ ] **2.17** Dashboard → **Run full scan** → wait for completion → **`/scans`** → **FULL** row shows **summed `gapsFound`** (not 0 when child scans found gaps)
- [ ] **2.18** On **`/scans`**, click **gapsFound** on a scan with gaps → **`/gaps?scanId=…`** → description **“Gaps from this scan run.”** and list matches that run
- [ ] **2.19** **`/scans`**: onboarding **lite scan** row shows **Lite** badge on trigger column
- [ ] **2.20** **`/scans`**: any **PENDING** row shows **Queued** (not raw `PENDING`)
- [ ] **2.21** **`/policies`**: **Generate bundle** → policies appear in sidebar
- [ ] **2.22** Edit title/body → **Save** enabled → save → refresh page → edits persist
- [ ] **2.23** **Regenerate with AI** → editor updates immediately (no second fetch); content differs from pre-regenerate
- [ ] **2.24** **Export MD** → `.md` file downloads (authenticated fetch, not blank/401)
- [ ] **2.25** **Publish** → status **PUBLISHED**; Evidence list gains **Policy:** row (unlinked POLICY type, no control required)
- [ ] **2.26** Open a **non-sample** gap (`isSample` false or badge absent) → **Ask Copilot to fix this** → `/copilot?gapId=…` → explain loads with gap-specific answer (not generic demo-only text if keys set)
- [ ] **2.27** On **`/copilot`**, send a follow-up message → response **streams**; suggestion chips do **not** reference sample/lite finding titles on a fresh org
- [ ] **2.28** Assistant message shows **Sources** / citations block (proves RAG retrieved chunks)

- [ ] **2.29** **`/risks`**: **Add risk** → appears in matrix/table → change status → **Export register** CSV downloads
- [ ] **2.30** **`/vendors`**: **Add vendor** → detail page → update review status → **Run questionnaire** opens `/questionnaire`
- [ ] **2.31** **`/team`**: admin: invite sends; member role: page loads without error (no invite panel)
- [ ] **2.32** **`/training`**: **Assign module** (create & assign) → **Mark complete** on a row → **Export training report** CSV
- [ ] **2.33** **`/billing`** (admin), plan name + usage stats match reality; no fake renewal email; **past_due** shows warning if testable in Stripe; invoice PDF opens when invoices exist; plan grid has no upgrade buttons (header only)
- [ ] **2.34** **`/integrations`** (admin), connect GitHub (or return from OAuth) → green **Connected** banner + card shows **Live**; **Disconnect** → card no longer **Live** (soft disconnect); OAuth failure shows red banner (not silent); AWS/Okta/JumpCloud show **Connect** (not “Coming soon”) when backend configured

**Member flow pass:** steps 2.2, 2.4–2.15, **2.17–2.18**, **2.21–2.24**, **2.26–2.28**, and at least one of 2.3/2.16 satisfied.

---

## 3. Auditor flow

Requires §1.1 Clerk + §2 complete on same org.

- [ ] **3.1** Admin invites `auditor@test.com` (or your inbox) as **Auditor** from **Team** page
- [ ] **3.2** Clerk sends **invite email** (not generic `/sign-up` only)
- [ ] **3.3** Accept invite → lands on **`/dashboard`** (not `/onboarding`)
- [ ] **3.4** **Read-only** badge visible; **Scans / Settings / Billing** hidden from nav
- [ ] **3.5** Direct navigate **`/settings`** → redirects to **`/dashboard`**
- [ ] **3.6** **Evidence** → set audit period → **Export audit package** → ZIP downloads
- [ ] **3.7** ZIP contains `manifest.json`, `controls/*.json`, and `files/` (if evidence has uploads)
- [ ] **3.8** DB: `Member.role === AUDITOR` for auditor user (Railway/psql or Prisma Studio)

---

## 4. Webhooks

- [ ] **4.1** **Settings → Webhooks** → add [webhook.site](https://webhook.site) URL (save signing secret when shown)
- [ ] **4.2** Click **Test** → `scan.completed` payload arrives (requires completed scan from §2)
- [ ] **4.3** HMAC validates on raw POST body:
  ```bash
  # X-Shieldoq-Signature: sha256=<hex>
  # sha256 === HMAC-SHA256(webhook_secret, raw_body)
  ```
- [ ] **4.4** Run scan (or use existing) → `gap.created` fires for **non-sample** gaps only (`isSample: false` in payload)

---

## 5. Notifications

- [ ] **5.1** `RESEND_API_KEY` set on Railway staging
- [ ] **5.2** Run scan → **scan-complete** email to org admins
- [ ] **5.3** If scan produces **CRITICAL/HIGH** non-sample gaps → **gap alert** email (optional if lite scan only has samples)

---

## 6. PostHog

- [ ] **6.1** `lite_scan_completed` in PostHog Live Events after lite scan (§2)
- [ ] **6.2** `auditor_invited` fires when sending auditor invite (§3)
- [ ] **6.3** Page views tracked with org context (identify on sign-in)

---

## Quick reference. API paths

| Check | Endpoint |
|-------|----------|
| Health | `GET {API_URL}/health` |
| Frameworks | `GET {API_URL}/api/v1/frameworks` |
| Enroll SOC 2 | `POST {API_URL}/api/v1/frameworks/soc2/enroll` |
| Gaps (framework) | `GET {API_URL}/api/v1/gaps?status=OPEN&framework=soc2` |
| Gaps (control) | `GET {API_URL}/api/v1/gaps?status=OPEN&control=CC6.1` |
| Gaps (cloud bucket) | `GET {API_URL}/api/v1/gaps?status=OPEN&source=NETWORK,ENCRYPTION,LOGGING,BACKUP,MONITORING` |
| Gaps (resolved) | `GET {API_URL}/api/v1/gaps?status=RESOLVED` |
| Gaps (by scan) | `GET {API_URL}/api/v1/gaps?status=OPEN&scanId={scanId}` |
| Full scan | `POST {API_URL}/api/v1/scans/full` `{ "async": true }` |
| Gap resolve | `PATCH {API_URL}/api/v1/gaps/:id` `{ "status": "RESOLVED" }` |
| Policy save | `PATCH {API_URL}/api/v1/policies/:id` `{ "title", "content" }` |
| Policy regenerate | `POST {API_URL}/api/v1/policies/:id/regenerate` |
| Policy export | `GET {API_URL}/api/v1/policies/:id/export` |
| Policy publish | `POST {API_URL}/api/v1/policies/:id/publish` |
| Copilot explain | `POST {API_URL}/api/v1/copilot/explain-gap/:gapId` |
| Copilot chat (stream) | `POST {API_URL}/api/v1/copilot/chat/stream` |
| Copilot reindex | `POST {API_URL}/api/v1/copilot/reindex` (admin) |
| Dashboard | `GET {API_URL}/api/v1/dashboard` |
| Webhook test | `POST {API_URL}/api/v1/settings/webhooks/:id/test` |
| Clerk webhook | `POST {API_URL}/api/v1/webhooks/clerk` |

---

## After smoke, demo script inputs

When all sections pass, record for demo script authoring:

```
Web URL:     ____________________
API URL:     ____________________
Gap ID:      ____________________  (resolved during smoke, pick another OPEN gap for live demo)
Scan ID:     ____________________
Demo org:    ____________________
Auditor:     ____________________
```

Then write the demo script against these values, no placeholders.

---

## Fix queue (fill on failure)

| Item | Section | Symptom | Owner / fix |
|------|---------|---------|-------------|
| | | | |
| | | | |
