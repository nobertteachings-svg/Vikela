# PagerDuty

**Category:** Observability  
**Connect type:** REST API access key  
**Path:** Integrations → Observability → **PagerDuty**

## What Vikela uses it for

Incidents and on-call configuration context for operational compliance evidence.

## Prerequisites

- PagerDuty account able to create a **REST API Access Key** (user or account-level per PagerDuty’s UI).
- Free integration slot.
- No Vikela-side PagerDuty OAuth app required.

## Connect steps

1. In PagerDuty: **Integrations** → **API Access Keys** (or User → API Access) → create a key.
2. In Vikela: **Integrations** → **PagerDuty** → **Connect**.
3. Paste the **API key**.
4. Submit; Vikela verifies and encrypts.
5. Confirm **Connected**.

## Permissions / scopes

Key must allow read access to incidents/services as required by Vikela’s verify and sync calls.

## Customer vs platform

| Side | What |
|------|------|
| Platform | None |
| Customer | REST API key |

## Verify success

Connected card.

## Disconnect

Disconnect in Vikela; revoke the key in PagerDuty.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| 401/403 | Regenerate key; ensure REST API key (not Events API routing key alone) |
| Limit reached | Free slot or upgrade |

Related: [Integrations overview](./README.md).
