# GitLab

**Category:** Git  
**Connect type:** OAuth  
**Path:** Integrations → Git → **GitLab**

## What Vikela uses it for

- List projects/groups for code scanning.
- Merge request and project configuration signals.
- System/project hooks for ongoing sync where enabled.

## Prerequisites

- Access to a GitLab.com (or configured self-managed) account with rights to authorize the Vikela OAuth app.
- Free integration slot.
- Platform env: `GITLAB_APP_ID` (and related secrets). Otherwise the card shows **Not configured**.

## Connect steps

1. Open **Integrations** → **GitLab** → **Connect**.
2. Sign in to GitLab if prompted and **Authorize** Vikela.
3. Return to Vikela and select projects/repos when asked.
4. Confirm **Connected**.

> **Screenshot:** GitLab OAuth authorize screen

## Permissions / scopes

Vikela requests the OAuth scopes registered for your deployment (typically read API / project access sufficient to list projects and read configuration). Exact scopes are set by the platform OAuth application.

## Customer vs platform

| Side | What |
|------|------|
| Platform | GitLab OAuth application ID/secret and callback URL |
| Customer | Authorize with your GitLab user/group access |

## Verify success

- Card **Connected**; projects selectable; code/full scan succeeds.

## Disconnect

Use disconnect on the Integrations card. Optionally revoke the application under GitLab → Preferences → Applications.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Not configured | Set `GITLAB_APP_ID` / secret; restart API |
| Redirect URI mismatch | Operator must align GitLab app callback with Vikela web/API callback routes |
| Empty project list | Authorize a user with group membership; reconnect |
| Limit reached | Free a slot or upgrade |

Related: [Integrations overview](./README.md).
