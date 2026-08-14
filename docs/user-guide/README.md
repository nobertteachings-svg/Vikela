# Shieldoq user guide

**Audience:** organization admins and operators using Shieldoq day to day (not developers deploying the platform).

Shieldoq maps **code**, **cloud**, and **identity** signals into compliance frameworks (SOC 2, ISO 27001, HIPAA, GDPR, and more). You connect providers, run scans, remediate gaps, collect evidence, and export for auditors.

## How Shieldoq fits together

```text
Integrations ──▶ Scans ──▶ Gaps / Findings ──▶ Controls & Frameworks
                      │                              │
                      ├─▶ Evidence locker ◀──────────┘
                      ├─▶ Remediation & Copilot
                      └─▶ Policies, Trust, Training, Risks, Vendors
```

1. **Connect** Git, cloud, identity, observability, and communication tools under [Integrations](./integrations/README.md).
2. **Scan** (dashboard full scan or Scans) to create findings.
3. **Gaps** become control failures; fix them, attach **evidence**, and raise readiness on **frameworks**.
4. Use **Copilot**, **policies**, **training**, **risks**, and **vendors** for ongoing operations.
5. **Auditors** get a read-focused shell plus evidence export; **admins** manage team, billing, and settings.

## Roles at a glance

| Role | Typical access |
|------|----------------|
| **Admin** | Full access: integrations, scans, team, settings, billing, delete org |
| **Member** | Work on gaps, evidence, policies, scans, remediation, Copilot |
| **Auditor** | Read-only compliance views; can export evidence; no integrations/team/billing/settings/scans |

Details: [Team and access](./team-and-access.md).

## Plan limits (enforced)

| Plan | Seats | Integrations | Scans / month | Evidence storage |
|------|-------|--------------|---------------|------------------|
| Free | 3 | 1 | 5 | 100 MB |
| Starter | 10 | 5 | 50 | 1 GB |
| Growth | 25 | 20 | 500 | 5 GB |
| Enterprise | 100 | 999 | High | 50 GB |

- Seats count **members + pending invites**.
- Integrations count **distinct active providers** (reconnecting the same provider does not use another slot).
- Hitting a limit returns an upgrade prompt (HTTP 402). See [Billing](./billing.md).

## Guide index

### Start here

- [Getting started](./getting-started.md), sign-up, org, onboarding, first scan, dashboard, scans, questionnaire, trust

### Integrations

- [Integrations overview](./integrations/README.md)
- **Git:** [GitHub](./integrations/github.md) · [GitLab](./integrations/gitlab.md) · [Bitbucket](./integrations/bitbucket.md)
- **Cloud:** [AWS](./integrations/aws.md) · [Azure](./integrations/azure.md) · [Google Cloud](./integrations/gcp.md) · [Cloudflare](./integrations/cloudflare.md)
- **Identity:** [Okta](./integrations/okta.md) · [Azure AD](./integrations/azure-ad.md) · [Google Workspace](./integrations/google-workspace.md) · [Auth0](./integrations/auth0.md) · [JumpCloud](./integrations/jumpcloud.md)
- **Observability:** [Datadog](./integrations/datadog.md) · [Grafana](./integrations/grafana.md) · [PagerDuty](./integrations/pagerduty.md) · [New Relic](./integrations/new-relic.md)
- **Communication:** [Slack](./integrations/slack.md) · [Microsoft Teams](./integrations/microsoft-teams.md)

Coming soon in the product UI (not connectable yet): DigitalOcean, Oracle Cloud, Alibaba Cloud.

### Compliance

- [Frameworks](./frameworks.md)
- [Controls](./controls.md)
- [Gaps and findings](./gaps-and-findings.md)
- [Evidence](./evidence.md)
- [Policies](./policies.md)

### Operations

- [Copilot](./copilot.md)
- [Risks](./risks.md)
- [Vendors](./vendors.md)
- [Team and access](./team-and-access.md)
- [Training](./training.md)
- [Settings](./settings.md)
- [Billing](./billing.md)

## Screenshot placeholders

In-app: open **Help** in the sidebar (`/help`), the same guide is rendered there for signed-in users.

Where a UI capture would help, pages include captions like:

> **Screenshot:** Integrations grid. Connected vs Connect vs Coming soon / Not configured

Capture those in your own environment when preparing customer-facing PDFs.

## Related developer docs

Platform operators and engineers: see [`docs/DEVELOPER_HANDOVER.md`](./DEVELOPER_HANDOVER.md), [`docs/PRODUCTION_SETUP.md`](./PRODUCTION_SETUP.md), and the root [README](././README.md).
