# Grafana

**Category:** Observability  
**Connect type:** Base URL + service account token  
**Path:** Integrations → Observability → **Grafana**

## What Vikela uses it for

Dashboards and alert configuration context for compliance/operations.

## Prerequisites

- A Grafana stack URL (Cloud example: `https://yourstack.grafana.net`) or self-managed base URL.
- Ability to create a **service account** and token (`glsa_…`) **on that stack**.
- Free integration slot.
- No Vikela-side Grafana OAuth secrets required.

## Connect steps

1. Open your Grafana **stack** (not only grafana.com access policies).
2. Create a **Service account** with Viewer (or appropriate read) role.
3. Add a token; copy the `glsa_…` value.
4. In Vikela: **Integrations** → **Grafana** → **Connect**.
5. Enter **Grafana URL** and **service account token**.
6. Submit. Vikela verifies (e.g. via authenticated `/api/user`).
7. Confirm **Connected**.

> **Screenshot:** Connect Grafana dialog (URL + token)

## Important: token type

| Token type | Works? |
|------------|--------|
| Stack service account `glsa_…` | Yes |
| grafana.com access-policy token | No, use stack SA token |

## Customer vs platform

| Side | What |
|------|------|
| Platform | None |
| Customer | Stack URL + `glsa_` token |

## Verify success

Connected; verify call succeeds (Play Grafana’s public `/api/org` is not sufficient alone. Vikela uses authenticated endpoints).

## Disconnect

Disconnect in Vikela; delete the service account token in Grafana.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Unauthorized | Wrong token type or expired SA token |
| Wrong URL | Use the stack URL (`*.grafana.net`), including `https://` |
| Limit reached | Free slot or upgrade |

Related: [Integrations overview](./README.md).
