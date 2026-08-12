# Auth0

**Category:** Identity  
**Connect type:** Management API (M2M) via dialog — customer Auth0 tenant + Vikela platform M2M client  
**Path:** Integrations → Identity → **Auth0**

## What Vikela uses it for

Auth0 tenant posture for identity scans: users, roles, attack protection–related signals as implemented by the provider.

## Prerequisites

- Auth0 tenant (domain like `your-tenant.us.auth0.com`).
- Free integration slot.
- Platform must expose a Management API M2M application: `AUTH0_MANAGEMENT_CLIENT_ID` / `AUTH0_MANAGEMENT_CLIENT_SECRET` (or legacy `AUTH0_CLIENT_ID`). Else **Not configured**.
- Your Auth0 tenant must authorize that M2M client (or you provide tenant domain so Vikela’s Management client can access it per your operator’s setup).

## Connect steps

1. Note your Auth0 **Domain** (Auth0 Dashboard → tenant domain).
2. In Vikela: **Integrations** → **Auth0** → **Connect**.
3. In the dialog, enter your **Auth0 domain** (and any other fields shown).
4. Submit. Vikela obtains a Management API token via the platform M2M client and verifies access.
5. Confirm **Connected**.

> **Screenshot:** Connect Auth0 dialog with domain field

## Permissions / scopes

Management API scopes required for user/role/security configuration reads (configured on the M2M app in Auth0 by your operator). Typical needs include read:users, read:roles, read:attack_protection (exact set depends on deployment).

## Customer vs platform

| Side | What |
|------|------|
| Platform | `AUTH0_MANAGEMENT_CLIENT_ID` / `SECRET` |
| Customer | Auth0 **domain** (tenant) in the connect dialog |

## Verify success

Connected; identity or full scan runs without Auth0 auth errors.

## Disconnect

Disconnect in Vikela. Optionally rotate the M2M client secret on the platform side.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Not configured | Operator sets Management client env; **restart API** (env reload) |
| Unauthorized / 401 from Auth0 | Authorize the M2M app on the tenant; check domain spelling (`xxx.us.auth0.com`) |
| Integration limit | Starter allows 5 providers — disconnect another (e.g. unused Bitbucket) then retry |
| Wrong region domain | Use the exact domain from the Auth0 dashboard |

Related: [Integrations overview](./README.md).
