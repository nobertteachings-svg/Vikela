# GitHub

**Category:** Git  
**Connect type:** GitHub App install and/or OAuth (platform-dependent)  
**Path:** Integrations → Git → **GitHub**

## What Vikela uses it for

- Discover and sync repositories for code scanning.
- Monitor PRs / branch protection signals used in compliance findings.
- Install webhooks so repo events can trigger or refresh scan context.

## Prerequisites

- Admin (or sufficient) rights on the GitHub org/user that owns the repos.
- A free **integration slot** on your plan.
- Vikela platform must have GitHub App and/or OAuth configured (`GITHUB_*` / App ID & private key). If the card says **Not configured**, ask your operator.

## Connect steps

1. Open **Integrations**.
2. Under Git, click **Connect** on **GitHub**.
3. You are redirected to GitHub to:
   - Install the Vikela GitHub App on an org/account, and/or
   - Authorize OAuth access (depending on deployment).
4. Grant access to **All repositories** or **Only select repositories**.
5. Return to Vikela. Complete **repository selection** if onboarding prompts you.
6. Confirm the GitHub card shows **Connected**.

> **Screenshot:** GitHub Connect → GitHub App install permissions screen

## Permissions / scopes (typical)

GitHub App permissions generally include repository contents/metadata and admin hooks as configured by your Vikela operator. Prefer least privilege: only repos that must be in scope for compliance.

## Customer vs platform

| Side | What |
|------|------|
| Platform | GitHub App credentials / OAuth client in Vikela `.env` |
| Customer | Install the app on *your* GitHub org and choose repos |

## Verify success

- Integrations card: **Connected**.
- Repos appear in onboarding / repo list.
- A code or full scan completes without GitHub auth errors.

## Disconnect

Disconnect from the Integrations card (or remove the GitHub App install under GitHub → Settings → Applications). Freeing the Vikela integration slot requires disconnecting in Vikela.

## Troubleshooting

| Error / symptom | Fix |
|-----------------|-----|
| Not configured | Operator configures GitHub App/OAuth and restarts API |
| Can’t see org repos | Reinstall app on the correct org; check you’re logged into the right GitHub user |
| Webhook / scan failures | Reconnect; ensure app still installed and repo still selected |
| Limit reached | Disconnect another provider or upgrade |

See also: [Integrations overview](./README.md), [Getting started](../getting-started.md).
