# Controls

**Path:** Sidebar → **Controls** (`/controls`)  
**Who:** Admin, Member, Auditor (view; auditors may see redacted detail per product policy).

## Purpose

The control library is the shared language between frameworks, gaps, and evidence. Each control has a live status driven by open gaps and linked evidence.

## Navigation and primary workflows

1. Open **Controls**.
2. Filter by **framework** (and other filters available in UI).
3. Open a control to see linked gaps and evidence.
4. From failing controls: remediate gaps, collect evidence, or ask [Copilot](./copilot.md).

> **Screenshot:** Controls table filtered by SOC 2

## Status meanings

| Status | Meaning |
|--------|---------|
| **Passing** | No blocking open gaps; evidence expectations met as modeled |
| **Failing** | One or more **open** gaps force failing |
| **In progress** | Work started; not fully passing |
| **Not started** | No meaningful activity yet |

Open gaps override toward **failing**.

## Related entities

- Frameworks (many-to-many style mapping across catalogs)  
- Gaps / findings (source: Code, Cloud, Identity)  
- Evidence items linked to controls  
- Policies that reference control/framework themes  

## Role notes

| Role | Notes |
|------|-------|
| Member | Update related gaps/evidence that change control status |
| Auditor | Review status; export evidence elsewhere as allowed |

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Always failing | Resolve or accept gaps; confirm sample/onboarding gaps aren’t the only signal |
| No evidence count | Upload or [collect from gaps](./evidence.md) |
| Wrong framework filter | Clear filters; confirm control is mapped in catalog |

See also: [Gaps and findings](./gaps-and-findings.md), [Evidence](./evidence.md).
