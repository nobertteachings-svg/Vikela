# Slack

**Category:** Communication  
**Connect type:** OAuth v2  
**Path:** Integrations → Communication → **Slack**

## What Shieldoq uses it for

Gap notifications and compliance alerts into Slack channels (chat write + channel discovery as scoped).

## Prerequisites

- Slack workspace admin/member allowed to install apps.
- Free integration slot.
- Platform: **both** `SLACK_CLIENT_ID` and `SLACK_CLIENT_SECRET` must be set. If either is missing, the card shows **Not configured**. After changing `.env`, **restart the API** so dotenv reloads.

## Connect steps

1. Confirm the Slack card is **Connect** (not Not configured).
2. **Integrations** → **Slack** → **Connect**.
3. Select workspace and approve scopes.
4. Optionally pick a channel if the OAuth flow includes incoming-webhook channel selection.
5. Return to Shieldoq; confirm **Connected**.

> **Screenshot:** Slack OAuth permission screen

## Permissions / scopes (typical)

- `chat:write`
- `channels:read`
- `groups:read`
- `team:read`
- `incoming-webhook`

Exact scopes are those requested by the Shieldoq Slack app.

## Customer vs platform

| Side | What |
|------|------|
| Platform | Slack app Client ID/Secret + redirect to Shieldoq callback (`/api/auth/slack/callback` via web proxy) |
| Customer | Authorize the workspace |

## Verify success

Connected; a test notification may appear depending on configuration. Check that alerts route after a scan/gap event if notifications are enabled.

## Disconnect

Disconnect in Shieldoq; remove the app under Slack → Manage apps.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Not configured | Set `SLACK_CLIENT_ID` **and** `SLACK_CLIENT_SECRET`; restart API |
| Still Not configured after env edit | API process did not reload env, restart `apps/api` |
| OAuth error | Fix redirect URL on the Slack app to match deployment |
| Limit reached | Free slot or upgrade |

Related: [Microsoft Teams](./microsoft-teams.md), [Settings](./settings.md) notifications.
