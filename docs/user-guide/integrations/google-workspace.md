# Google Workspace

**Category:** Identity  
**Connect type:** OAuth  
**Path:** Integrations → Identity → **Google Workspace**

## What Vikela uses it for

Workspace directory posture: users, MFA, admin audit signals used by identity scans.

Separate from [Google Cloud](./gcp.md) project scanning.

## Prerequisites

- Google Workspace admin (or user allowed to authorize Admin SDK scopes your operator configured).
- Free integration slot.
- Platform: `GOOGLE_WORKSPACE_CLIENT_ID`. Else **Not configured**.

## Connect steps

1. **Integrations** → **Google Workspace** → **Connect**.
2. Choose the Workspace admin Google account and consent.
3. Confirm **Connected**.
4. Run identity or full scan.

## Permissions / scopes

Admin SDK / directory scopes on the Vikela Google OAuth client.

## Customer vs platform

| Side | What |
|------|------|
| Platform | Google OAuth client for Workspace |
| Customer | Authorize the Workspace domain |

## Verify success

Connected; identity scan results appear.

## Disconnect

Disconnect in Vikela; revoke third-party access in Google.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Not configured | Set Workspace client env; restart API |
| Insufficient admin | Use a Super Admin or grant needed admin roles |
| Limit reached | Free slot or upgrade |

Related: [GCP](./gcp.md).
