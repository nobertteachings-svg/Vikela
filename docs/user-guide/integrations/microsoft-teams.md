# Microsoft Teams

**Category:** Communication  
**Connect type:** Incoming Webhook URL (API-key style dialog)  
**Path:** Integrations → Communication → **Microsoft Teams**

## What Shieldoq uses it for

Post compliance / gap alerts into a Teams channel via an **Incoming Webhook**. This is **not** full Microsoft OAuth for Teams.

## Prerequisites

- Ability to add connectors / Incoming Webhook to a Teams channel.
- Free integration slot.
- No Shieldoq-side Teams OAuth app required.

## Connect steps

1. In Microsoft Teams, open the target channel → **Connectors** / **Manage channel** → **Incoming Webhook** (or Workflows incoming webhook, depending on tenant UI).
2. Create a webhook, name it (e.g. “Shieldoq”), upload an icon if desired, and **copy the webhook URL**.
3. In Shieldoq: **Integrations** → **Microsoft Teams** → **Connect**.
4. Paste the **webhook URL** in the dialog.
5. Submit. Shieldoq **probes** the webhook by posting a short test message.
6. Confirm the test message in Teams and **Connected** in Shieldoq.

> **Screenshot:** Connect Microsoft Teams dialog (webhook URL)

## Permissions / scopes

Channel members who can manage connectors. The webhook URL itself is the secret, treat it like a password.

## Customer vs platform

| Side | What |
|------|------|
| Platform | None |
| Customer | Incoming Webhook URL |

## Verify success

Test message appears in the channel; card **Connected**.

## Disconnect

Disconnect in Shieldoq; remove the Incoming Webhook connector in Teams (invalidates the URL).

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Probe failed | URL truncated/expired; recreate webhook |
| Message in wrong channel | Create webhook on the intended channel |
| Tenant disabled connectors | Ask Teams admin to allow Incoming Webhooks |
| Limit reached | Free slot or upgrade |

Related: [Slack](./slack.md), [Integrations overview](./README.md).
