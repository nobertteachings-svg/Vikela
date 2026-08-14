# Bitbucket

**Category:** Git  
**Connect type:** OAuth  
**Path:** Integrations → Git → **Bitbucket**

## What Shieldoq uses it for

- Workspaces and repositories for code scanning.
- Pull request and repository settings signals.
- Webhooks for sync where enabled.

## Prerequisites

- Bitbucket Cloud account with access to the target workspace.
- Free integration slot.
- Platform env: `BITBUCKET_CLIENT_ID` (and secret). Otherwise **Not configured**.

## Connect steps

1. **Integrations** → **Bitbucket** → **Connect**.
2. Authorize Shieldoq in Bitbucket.
3. Select workspace/repos when prompted in Shieldoq.
4. Confirm **Connected**.

## Permissions / scopes

Scopes match the Bitbucket OAuth consumer registered by your operator (repository read, webhook, account as configured).

## Customer vs platform

| Side | What |
|------|------|
| Platform | Bitbucket OAuth consumer credentials + callback |
| Customer | Authorize workspace access |

## Verify success

Connected card; repos listed; scan completes.

## Disconnect

Disconnect in Shieldoq; revoke access under Bitbucket → Personal settings → App authorizations if desired.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Not configured | `BITBUCKET_CLIENT_ID` / secret + API restart |
| Wrong workspace | Reconnect while logged into the correct Atlassian account |
| Limit reached | Disconnect unused provider or upgrade |

Related: [Integrations overview](./README.md).
