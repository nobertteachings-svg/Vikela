# Getting started

This guide walks a new organization from sign-up through the first meaningful scan and compliance view.

## Prerequisites

- A work email (Clerk authentication).
- Admin rights in your Vikela organization (first user who creates the org is typically admin).
- At least one integration slot on your plan ([plan limits](./README.md#plan-limits-enforced)).

## Sign up and sign in

1. Open your Vikela app URL (for example `https://app.example.com` or local `http://localhost:3000`).
2. Choose **Sign up** or **Sign in**.
3. Complete Clerk authentication (email / SSO as configured by your operator).
4. After auth, create or join an organization if prompted.

> **Screenshot:** Sign-in card with Vikela branding

### Troubleshooting

| Symptom | What to try |
|---------|-------------|
| Infinite redirect / blank app | Confirm cookies are allowed; try another browser; ask your operator if Clerk keys match the deployed instance |
| “Organization required” | Create an org or accept an invite from an admin |
| Wrong org | Use the org switcher in the app shell (Clerk organization switcher) |

## Onboarding (first-time)

New orgs are guided through onboarding. Typical steps:

1. **Connect repositories** — link GitHub, GitLab, or Bitbucket and select repos to monitor. See [GitHub](./integrations/github.md), [GitLab](./integrations/gitlab.md), [Bitbucket](./integrations/bitbucket.md).
2. **Invite team** — add members/admins/auditors. See [Team and access](./team-and-access.md).
3. **Optional cloud / identity** — connect AWS, Azure, GCP, Okta, etc. from [Integrations](./integrations/README.md).

You can skip optional steps and finish later from **Integrations** and **Team**.

Auditors cannot access `/onboarding`.

## First scan

After at least one Git (or cloud/identity) integration is connected:

1. Go to **Dashboard** (`/dashboard`).
2. Use **Full scan** (or run a scan from **Scans** / a connected account).
3. Wait for the job to finish (scans run in the background when long-running).
4. Open **Gaps** to review findings, then **Frameworks** / **Controls** for posture.

> **Screenshot:** Dashboard with posture score and Full scan button

### What a full scan covers

Depending on connected providers:

- **Code** — repositories (branch protection, secrets patterns, etc. per scanner).
- **Cloud** — AWS AssumeRole checks, Azure/GCP/Cloudflare where connected.
- **Identity** — MFA, inactive users, directory posture where connected.

Findings become **gaps** linked to **controls** and enrolled **frameworks**.

## Dashboard

**Path:** Sidebar → **Dashboard** (`/dashboard`)

**Purpose:** Single overview of posture score, framework readiness, top open gaps, evidence coverage, and scan actions.

**Who:** Admin and Member (primary). Auditors see a read-focused dashboard without scan/admin surfaces.

### Primary workflows

- Review overall score and top gaps.
- Jump into frameworks or gaps.
- Trigger a **full scan**.
- Spot evidence coverage gaps.

Related: [Gaps and findings](./gaps-and-findings.md), [Frameworks](./frameworks.md), [Scans](#scans).

## Scans

**Path:** Sidebar → **Scans** (`/scans`) — **hidden for auditors**

**Purpose:** History of code, cloud, identity, and full scans; posture trend over time.

### Status meanings (typical)

| Status | Meaning |
|--------|---------|
| Queued / Running | Job in progress |
| Completed | Findings written; score updated |
| Failed | Check integration health; reconnect provider if tokens expired |

Billable scans count toward your monthly plan limit (parent scans in the current UTC calendar month). See [Billing](./billing.md).

## Questionnaire

**Path:** `/questionnaire` (also linked from vendor detail → Run / Open questionnaire)

**Purpose:** Complete a production vendor security assessment (30 questions across governance, IAM, data protection, vulnerability management, incident response, privacy, and subprocessors).

**Workflow:**
1. Open `/questionnaire` or start from a vendor.
2. Edit suggested answers; set each item to **Approved**, **Needs edit**, or **Skip**.
3. Use **Approve all** when answers are ready, then **Mark complete**.
4. **Export CSV** for evidence packs. **New assessment** starts a fresh bank (`forceNew`) without deleting prior ones.

Query params: `vendorId` (scope to a vendor), `qid` (open a specific questionnaire).

## Trust center

**Path:** `/trust` (also linked from Settings → General)

**Purpose:** Public-style trust view for your org: enrolled frameworks, published policies, and SOC 2 report request flows where enabled.

Admins configure org naming and trust URL preview under [Settings](./settings.md). Visitors and customers use this to see published posture without full app access.

> **Screenshot:** Trust page with frameworks and published policies

## Remediation and audit (adjacent)

- **Remediation** (`/remediation`) — step-by-step plans for open critical/high gaps. See [Gaps and findings](./gaps-and-findings.md).
- **Audit** (`/audit`) — recent compliance/scan activity trail.

## Recommended first week

1. Connect **one Git** provider and select critical repos.
2. Connect **one cloud** or **identity** provider if you have capacity on your plan.
3. Run a **full scan**; triage critical/high gaps.
4. Enroll target frameworks (e.g. SOC 2).
5. Upload or collect **evidence** for key controls.
6. Invite an **auditor** when you are ready for review.
7. Set notification preferences and billing method under Settings / Billing.

## Next steps

- [Integrations overview](./integrations/README.md)
- [Frameworks](./frameworks.md)
- [Team and access](./team-and-access.md)
