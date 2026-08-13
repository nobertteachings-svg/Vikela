# Datadog

**Category:** Observability  
**Connect type:** API key + Application key  
**Path:** Integrations → Observability → **Datadog**

## What Vikela uses it for

Monitors, logs, and security signals context for compliance evidence and operational visibility.

## Prerequisites

- Datadog org access to create an **API key** and **Application key**.
- Know your Datadog **site** (e.g. `datadoghq.com`, `datadoghq.eu`).
- Free integration slot.
- No Vikela-side Datadog secrets required.

## Connect steps

1. In Datadog: **Organization Settings** → **API Keys** → create an API key.
2. **Organization Settings** → **Application Keys** → create an Application key (associated with a user that has needed read permissions).
3. If you are in Datadog product onboarding (Agent / AWS), you can **skip** those steps for Vikela connect, keys are enough.
4. In Vikela: **Integrations** → **Datadog** → **Connect**.
5. Enter **API key**, **Application key**, and **site**.
6. Submit; Vikela verifies then encrypts credentials.
7. Confirm **Connected**.

> **Screenshot:** Connect Datadog dialog (API key, app key, site)

## Permissions / scopes

Application key permissions follow the creating user’s roles. Prefer a service user with read access to monitors/security signals.

## Customer vs platform

| Side | What |
|------|------|
| Platform | None |
| Customer | API key + Application key + site |

## Verify success

Connected card; optional scans/workflows that read Datadog succeed.

## Disconnect

Disconnect in Vikela; revoke keys in Datadog.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| 403 / invalid | Wrong site region; regenerate keys |
| Stuck in Datadog onboarding UI | Skip Agent install; go to Organization Settings for keys |
| Limit reached | Free slot or upgrade |

Related: [Integrations overview](./README.md).
