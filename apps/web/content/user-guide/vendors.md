# Vendors

**Path:** Sidebar → **Vendors** (`/vendors`), detail `/vendors/[id]`  
**Who:** Admin, Member. Auditor (read).

## Purpose

Third-party / vendor risk register: track vendors, scores, questionnaires, and residual risk from suppliers that process your data or affect compliance.

## Navigation and primary workflows

1. Open **Vendors**: list vendors and scores.
2. **Add** or **edit** a vendor (name, contact, risk tier, etc.).
3. Open detail: review score, actions, linked questionnaire.
4. Launch or continue a [Questionnaire](./getting-started.md#questionnaire) with `vendorId` when assessing a supplier. The production bank covers governance, access, encryption, IR, privacy, and subprocessors (30 questions).
5. Update status after reviews; escalate high-risk vendors to [Risks](./risks.md).

> **Screenshot:** Vendor detail with score and edit form

## Score meanings

Vendor scores summarize questionnaire answers and risk inputs (product-calculated). Treat low scores as priority for follow-up evidence or contract controls.

## Related entities

- Questionnaire flow  
- Risk register  
- Evidence (SOC reports, DPAs uploaded in Evidence locker)  

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Score not updating | Complete questionnaire; save vendor edits; refresh |
| Questionnaire empty | Open from vendor detail or `/questionnaire?vendorId=…` |
| Can’t edit | Confirm Member/Admin role |

Back to [User guide index](./README.md).
