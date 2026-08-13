# Evidence

**Path:** Sidebar → **Evidence** (`/evidence`)  
**Who:** Admin, Member (upload). **Auditor** (export; upload UI hidden).

## Purpose

The evidence locker stores proof that controls are operating, uploads, auto-collected artifacts from findings, and audit-period exports for external auditors.

## Navigation and primary workflows

1. Open **Evidence**.
2. Review coverage: controls with ≥1 linked evidence item.
3. **Upload** files and optionally link a control.
4. **Collect from gaps** for eligible open findings.
5. Set an **audit period** and **export** (ZIP) when preparing for audit, auditors use export heavily.

> **Screenshot:** Evidence locker with coverage meter and upload

## Accepted upload types

`.pdf`, `.png`, `.jpg`, `.jpeg`, `.txt`, `.csv`, `.json`

Uploads go to object storage (S3), not the database. Type may be recorded as `OTHER` unless the UI offers finer types.

## Coverage

**Coverage** ≈ share of controls that have at least one linked evidence item. Pair with gap closure for real audit readiness, not uploads alone.

## Plan storage

Evidence storage counts against plan MB limits (product may approximate usage). See [Billing](./billing.md). Over-limit actions may be blocked until you delete evidence or upgrade.

## Role notes

| Role | Upload | Export |
|------|--------|--------|
| Admin | Yes | Yes (API allows OWNER/ADMIN) |
| Member | Yes | Per API policy |
| Auditor | No (UI hidden) | Yes (`canExportEvidence`) |

## Related entities

- [Controls](./controls.md)  
- [Gaps and findings](./gaps-and-findings.md)  
- [Frameworks](./frameworks.md)  

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Upload fails | Check file type/size; storage plan limit; admin role |
| Cannot collect from gap | Sample/onboarding gaps are blocked |
| Export empty | Widen audit period; confirm items exist |
| Auditor can’t upload | Expected, use export or ask a member to upload |

Back to [User guide index](./README.md).
