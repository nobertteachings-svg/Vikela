# Cloudflare

**Category:** Cloud  
**Connect type:** API token (customer-supplied)  
**Path:** Integrations → Cloud → **Cloudflare**

## What Vikela uses it for

Cloudflare account posture: Access / Zero Trust, WAF, SSL, and related configuration signals used in compliance scanning.

## Prerequisites

- Cloudflare account with permission to create API tokens.
- Your **Account ID** (Cloudflare dashboard → overview / account home).
- Free integration slot.
- **No** Vikela-side Cloudflare platform secrets are required.

## Connect steps

1. In Cloudflare, create an **API Token** with read access to the resources Vikela needs (account-level read for Zero Trust / zone settings as appropriate). Prefer least privilege.
2. Copy the **Account ID**.
3. In Vikela: **Integrations** → **Cloudflare** → **Connect**.
4. Paste **API token** and **Account ID** in the dialog.
5. Submit. Vikela verifies the token, then stores it encrypted.
6. Confirm **Connected**.

> **Screenshot:** Connect Cloudflare dialog (token + account ID)

## Permissions / scopes

Token permissions must allow Vikela’s verify call and subsequent scanner reads. If verify fails, widen read scopes or confirm Account ID.

## Customer vs platform

| Side | What |
|------|------|
| Platform | None required for Cloudflare |
| Customer | API token + Account ID |

## Verify success

Connected card; optional cloud/full scan includes Cloudflare-sourced findings.

## Disconnect

Disconnect in Vikela. Rotate/delete the API token in Cloudflare.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Invalid token | Recreate token; ensure it isn’t expired |
| Wrong Account ID | Copy from the account that owns the zones/Zero Trust org |
| Verify failed | Add missing read permissions on the token |
| Limit reached | Free slot or upgrade |

Related: [Integrations overview](./README.md).
