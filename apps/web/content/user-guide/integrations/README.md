# Integrations overview

**Path:** Sidebar → **Integrations** (`/integrations`)  
**Who can manage:** **Admin** (and other roles allowed by your org policy for connect). Auditors cannot open this page.

Integrations are how Vikela reads your systems. Each **active provider** counts toward your plan’s integration limit.

## Categories

| Category | Providers (live) | Typical use |
|----------|------------------|-------------|
| **Git** | GitHub, GitLab, Bitbucket | Code scans, repos, PRs/MRs, webhooks |
| **Cloud** | AWS, Azure, GCP, Cloudflare | IAM, storage, logging, Zero Trust / WAF |
| **Identity** | Okta, Azure AD, Google Workspace, Auth0, JumpCloud | MFA, users, directory posture |
| **Observability** | Datadog, Grafana, PagerDuty, New Relic | Monitors, alerts, incidents (evidence & context) |
| **Communication** | Slack, Microsoft Teams | Notifications into channels |

**Coming soon** in the grid (not connectable): DigitalOcean, Oracle Cloud, Alibaba Cloud.

## Connect types

| Type | What you do in Vikela | Examples |
|------|----------------------|----------|
| **App install / OAuth** | Click Connect → authorize in the provider | GitHub, GitLab, Bitbucket, Azure, GCP, Okta, Slack |
| **AssumeRole** | Paste Role ARN (+ external ID) after deploying a stack | AWS |
| **API key / token** | Paste keys or webhook URL in a dialog; Vikela verifies then stores encrypted | Cloudflare, JumpCloud, Auth0 (M2M), Datadog, Grafana, PagerDuty, New Relic, Teams |

Tokens are encrypted at rest (AES-256-GCM). AWS never stores long-lived customer access keys—only AssumeRole.

## Plan limits

| Plan | Max distinct active providers |
|------|-------------------------------|
| Free | 1 |
| Starter | 5 |
| Growth | 20 |
| Enterprise | 999 |

If you see **Integration limit reached**, disconnect an unused provider or [upgrade](../billing.md). Reconnecting the **same** provider does not consume an extra slot.

## Grid status labels

| Label | Meaning |
|-------|---------|
| **Connected** | Active integration for this org |
| **Connect** | Ready to connect |
| **Not configured** | Vikela platform credentials for this provider are missing (ask your operator) |
| **Coming soon** | No live connect path yet |

> **Screenshot:** Integrations provider grid by category

## Common workflows

### Connect a provider

1. Open **Integrations**.
2. Find the provider card.
3. Click **Connect** (or open the dialog for API-key providers).
4. Complete OAuth / install / dialog fields.
5. Confirm the card shows **Connected**.
6. For Git: finish repo selection if prompted (onboarding or sync).
7. Run a scan from Dashboard or Scans.

### Disconnect / free a slot

1. Open the connected provider’s actions (disconnect / deactivate as shown in UI).
2. Confirm. The provider no longer counts toward the limit.
3. Data already collected (historical gaps/evidence) may remain; new scans for that provider stop.

Exact disconnect UX may vary by provider; if a card stays Connected after an error, refresh and try again or contact support.

### Verify success

- Card shows **Connected**.
- Optional: trigger a scan and confirm new findings or a completed scan on **Scans**.
- For Slack/Teams: look for a test or notification message where applicable.

## Platform vs customer credentials

| Kind | Who configures | Examples |
|------|----------------|----------|
| **Platform** (Vikela operator `.env`) | Your Vikela host | `GITHUB_*`, `GITLAB_APP_ID`, `SLACK_CLIENT_ID`, `AUTH0_MANAGEMENT_CLIENT_ID`, Azure/GCP OAuth apps |
| **Customer** (you in the UI) | Org admin | AWS Role ARN, Cloudflare API token, Datadog keys, Teams webhook URL |

If Connect shows **Not configured**, the platform side is incomplete—customer keys alone cannot fix it.

## Troubleshooting (all providers)

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Connect disabled / Not configured | Missing platform OAuth secrets | Operator sets env and **restarts API** |
| Integration limit reached | Plan cap | Disconnect unused provider or upgrade |
| OAuth returns to app with error | Wrong callback URL, revoked app, wrong account | Check provider app settings; use work account where required |
| Connected but scans fail | Expired token, missing permissions | Disconnect and reconnect; widen scopes |
| Azure “no subscriptions” | Tenant has no Azure subscription | Create a subscription in that Entra tenant |

## Provider guides

### Git

- [GitHub](./github.md)
- [GitLab](./gitlab.md)
- [Bitbucket](./bitbucket.md)

### Cloud

- [AWS](./aws.md)
- [Azure](./azure.md)
- [Google Cloud (GCP)](./gcp.md)
- [Cloudflare](./cloudflare.md)

### Identity

- [Okta](./okta.md)
- [Azure AD](./azure-ad.md)
- [Google Workspace](./google-workspace.md)
- [Auth0](./auth0.md)
- [JumpCloud](./jumpcloud.md)

### Observability

- [Datadog](./datadog.md)
- [Grafana](./grafana.md)
- [PagerDuty](./pagerduty.md)
- [New Relic](./new-relic.md)

### Communication

- [Slack](./slack.md)
- [Microsoft Teams](./microsoft-teams.md)

Back to [User guide index](../README.md).
