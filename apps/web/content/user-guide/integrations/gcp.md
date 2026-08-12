# Google Cloud (GCP)

**Category:** Cloud  
**Connect type:** OAuth  
**Path:** Integrations → Cloud → **Google Cloud**

## What Vikela uses it for

GCP posture: IAM, audit logs, Security Command Center–related signals as implemented by the scanner.

## Prerequisites

- Google account with access to the GCP project(s) to scan.
- Free integration slot.
- Platform: `GCP_CLIENT_ID` (and secret). Else **Not configured**.

## Connect steps

1. **Integrations** → **Google Cloud** → **Connect**.
2. Choose the Google account and grant OAuth consent.
3. Return to Vikela; confirm **Connected**.

## Permissions / scopes

Cloud Platform / IAM read scopes as registered on the Vikela GCP OAuth client.

## Customer vs platform

| Side | What |
|------|------|
| Platform | GCP OAuth client ID/secret + redirect |
| Customer | Authorize projects your user can access |

## Verify success

Connected; cloud or full scan completes.

## Disconnect

Disconnect in Vikela; revoke under Google Account → Security → Third-party access.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Not configured | `GCP_CLIENT_ID` + restart API |
| Insufficient permissions | Use a user with Viewer (or stronger) on target projects |
| Limit reached | Free slot or upgrade |

Related: [Google Workspace](./google-workspace.md) for identity/directory (separate integration).
