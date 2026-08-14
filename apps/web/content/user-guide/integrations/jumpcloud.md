# JumpCloud

**Category:** Identity  
**Connect type:** API key  
**Path:** Integrations → Identity → **JumpCloud**

## What Shieldoq uses it for

Directory / MFA / system user posture for identity compliance scans.

## Prerequisites

- JumpCloud admin who can enable **API access** and create an API key.
- Role note: API access is often tied to **Administrator with Billing**. Do not demote your last billing admin or you may lock yourself out of API access.
- Free integration slot.
- No Shieldoq-side JumpCloud platform secrets required.

## Connect steps

1. In JumpCloud Admin Portal, ensure your admin has API access enabled (**Enable API access**).
2. Create / copy an **API key** (Settings → API Settings, or equivalent).
3. In Shieldoq: **Integrations** → **JumpCloud** → **Connect**.
4. Paste the **API key** only (no account ID field).
5. Submit. Shieldoq verifies the key, then stores it encrypted.
6. Confirm **Connected**.

> **Screenshot:** Connect JumpCloud dialog (API key)

## Permissions / scopes

API key inherits the permissions of the admin that created it. Use a dedicated admin with least privilege that still allows directory reads for scanning.

## Customer vs platform

| Side | What |
|------|------|
| Platform | None |
| Customer | JumpCloud API key |

## Verify success

Connected; identity scan completes.

## Disconnect

Disconnect in Shieldoq; rotate/delete the API key in JumpCloud.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| API access disabled | Enable API access on an Administrator with Billing |
| Invalid key | Recreate key; ensure you copied the full value |
| Locked out of billing/API | Restore Administrator with Billing on an admin account |
| Limit reached | Free slot or upgrade |

Related: [Integrations overview](./README.md).
