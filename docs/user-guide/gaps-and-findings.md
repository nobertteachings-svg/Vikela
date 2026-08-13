# Gaps and findings

**Path:** Sidebar → **Gaps** (`/gaps`)  
**Related:** **Remediation** (`/remediation`), **Scans** (`/scans`)  
**Who:** Admin, Member (write). Auditor (read).

## Purpose

Gaps are compliance findings produced primarily by **scans** of code, cloud, and identity. They are the operational queue: triage, remediate, accept, or resolve, and collect evidence when ready.

## How scans relate

```text
Integrations → Scan job → Findings → Gaps → Control status → Framework readiness
```

- **Code** findings → from Git providers  
- **Cloud** findings → from AWS / Azure / GCP / Cloudflare  
- **Identity** findings → from Okta / Azure AD / Workspace / Auth0 / JumpCloud  

Full scans combine available sources. Scan history lives under **Scans** (not visible to auditors).

## Navigation and primary workflows

1. Open **Gaps**.
2. Filter by period, severity, source, framework, control, or scan.
3. Toggle **Open** vs **Resolved** views.
4. Open a gap: read remediation guidance, resource id/region, severity.
5. Update status (In progress → Resolved / Accepted) as your process allows.
6. Use **Collect from gaps** to push suitable findings into the [Evidence](./evidence.md) locker.
7. For critical/high queues, use **Remediation** for step-by-step plans.

> **Screenshot:** Gaps list with severity and source filters

## Status meanings

| Status | Meaning |
|--------|---------|
| **Open** | Needs attention; typically fails related controls |
| **In progress** | Owned / being fixed |
| **Resolved** | Fixed and verified |
| **Accepted** | Risk accepted per org policy (still document evidence as required) |

## Field meanings (scanner findings)

Findings are expected to include:

| Field | Meaning |
|-------|---------|
| **Source** | Code / Cloud / Identity (or provider) |
| **Severity** | Critical / High / Medium / Low (as emitted) |
| **Resource type / id** | What failed (repo, bucket, user, etc.) |
| **Region** | Cloud region when applicable |
| **Remediation** | Suggested fix text |

## Special cases

- **Sample / onboarding gaps** may exist for demos. They typically **cannot** be promoted to audit evidence via collect-from-gaps.
- Closing gaps without fixing the underlying resource may cause the next scan to reopen findings.

## Related entities

- [Controls](./controls.md), [Frameworks](./frameworks.md)  
- [Evidence](./evidence.md), [Copilot](./copilot.md)  
- [Risks](./risks.md) for accepted residual risk tracking  

## Role notes

| Role | Notes |
|------|-------|
| Admin / Member | Triage and remediate |
| Auditor | Review open/resolved; no Scans page |

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| No gaps after scan | Confirm integrations connected; check Scans for failures |
| Collect evidence blocked | Gap may be sample/onboarding-only |
| Score unchanged | Ensure gap status updates and controls remapped; refresh dashboard |
| Duplicate noise | Filter by latest scan; resolve duplicates per run |

Back to [User guide index](./README.md).
