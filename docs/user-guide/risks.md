# Risks

**Path:** Sidebar → **Risks** (`/risks`)  
**Who:** Admin, Member. Auditor (read).

## Purpose

Maintain an organizational **risk register**: track risks beyond individual scan gaps, assign owners, and record mitigation, especially for accepted findings or business risks frameworks expect you to manage.

## Navigation and primary workflows

1. Open **Risks**.
2. Create a risk with title, description, severity/likelihood fields as shown.
3. Link context (framework/control/vendor) when fields exist.
4. Update mitigation status over time.
5. Review the register before audits alongside [Gaps](./gaps-and-findings.md) and [Vendors](./vendors.md).

> **Screenshot:** Risk register table

## Field / status meanings

Typical fields (labels may vary slightly in UI):

| Field | Meaning |
|-------|---------|
| Severity / impact | Business impact if realized |
| Likelihood | Chance of occurrence |
| Status | Open / mitigating / closed |
| Owner | Responsible person |

## Related entities

- Accepted gaps → document residual risk here  
- [Vendors](./vendors.md) for third-party risk  
- [Frameworks](./frameworks.md)  

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Can’t create | Confirm write role (not auditor-only) |
| Missing fields after upgrade | Refresh; migrations may add register columns, re-edit the risk |

Back to [User guide index](./README.md).
