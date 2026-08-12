# New Relic

**Category:** Observability  
**Connect type:** User API key (+ optional account ID / region)  
**Path:** Integrations → Observability → **New Relic**

## What Vikela uses it for

APM and alert posture context via New Relic APIs (NerdGraph validation on connect).

## Prerequisites

- New Relic user able to create a **User API key** (`NRAK-…`).
- Optional: Account ID; region **US** or **EU**.
- Free integration slot.
- No platform New Relic secrets required.

## Connect steps

1. In New Relic: **API keys** → create a **User** key (`NRAK-…`).
2. Optionally note Account ID and whether you are on US or EU.
3. In Vikela: **Integrations** → **New Relic** → **Connect**.
4. Paste **User API key**, optional **account ID**, select **region**.
5. Submit; Vikela validates via NerdGraph.
6. Confirm **Connected**.

> **Screenshot:** Connect New Relic dialog

## Permissions / scopes

User key permissions follow the user’s role. Ensure read access needed for account validation.

## Customer vs platform

| Side | What |
|------|------|
| Platform | None |
| Customer | `NRAK-` key, region, optional account ID |

## Verify success

Connected; NerdGraph validation passed.

## Disconnect

Disconnect in Vikela; revoke the user key in New Relic.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Invalid key | Use User key `NRAK-…`, not ingest license key |
| Wrong region | Switch US/EU to match your New Relic account |
| Limit reached | Free slot or upgrade |

Related: [Integrations overview](./README.md).
