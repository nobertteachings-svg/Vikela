# Copilot

**Path:** Sidebar → **Copilot** (`/copilot`)  
**Who:** Admin, Member (primary). Auditor may have limited/read context depending on deployment.

## Purpose

AI assistant grounded in your workspace: ask about gaps, controls, evidence, and remediation without leaving Shieldoq. Answers should reference your org’s data, not generic internet advice alone.

## Navigation and primary workflows

1. Open **Copilot**.
2. Ask a concrete question (examples below).
3. Follow suggested remediation or deep links into gaps/controls.
4. Verify any change in the source pages before marking work done.

> **Screenshot:** Copilot workspace with a gap remediation answer

### Example prompts

- “What are my top critical open gaps for SOC 2?”
- “How do I remediate the public S3 finding on bucket X?”
- “Which controls lack evidence this audit period?”
- “Summarize identity MFA gaps from the last scan.”

## Related entities

- [Gaps and findings](./gaps-and-findings.md)  
- [Controls](./controls.md)  
- [Evidence](./evidence.md)  
- [Remediation](./getting-started.md#remediation-and-audit-adjacent)  

## Role notes

| Role | Notes |
|------|-------|
| Member | Day-to-day remediation assistant |
| Admin | Same + org-wide prioritization |
| Auditor | Prefer primary evidence/gap pages for formal review |

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Empty / generic answers | Ensure scans and gaps exist; reconnect integrations |
| Copilot errors | Operator checks LLM/API keys; retry later |
| Stale advice | Re-run scan; ask again citing latest scan id |

Back to [User guide index](./README.md).
