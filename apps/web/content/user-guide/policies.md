# Policies

**Path:** Sidebar → **Policies** (`/policies`)  
**Who:** Admin, Member (generate/edit/publish). Auditor (read published posture; Trust center).

## Purpose

Create, edit, and publish security/compliance policies mapped to frameworks. Published policies can surface on the [Trust center](./getting-started.md#trust-center).

## Navigation and primary workflows

1. Open **Policies**.
2. Generate or draft a policy (AI-assisted where available).
3. Edit content to match your real practices—do not publish boilerplate you do not follow.
4. Map to relevant frameworks/controls as the UI allows.
5. **Publish** when ready for internal use / trust page.
6. Revise and re-publish when controls or org practices change.

> **Screenshot:** Policy editor with framework mapping

## Status meanings (typical)

| State | Meaning |
|-------|---------|
| Draft | Internal only |
| Published | Visible per trust/org rules |

## Related entities

- [Frameworks](./frameworks.md)  
- [Controls](./controls.md)  
- [Training](./training.md) (awareness aligned to policy themes)  
- Trust page  

## Role notes

| Role | Notes |
|------|-------|
| Admin / Member | Own the policy lifecycle |
| Auditor | Verify published policies match evidence |

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Not on Trust page | Ensure policy is **Published**; check Trust configuration in Settings |
| AI generate unavailable | Operator must configure LLM keys; try manual draft |
| Stale content | Schedule periodic review after major control changes |

Back to [User guide index](./README.md).
