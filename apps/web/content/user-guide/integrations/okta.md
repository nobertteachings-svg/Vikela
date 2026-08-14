# Okta

**Category:** Identity  
**Connect type:** OAuth  
**Path:** Integrations → Identity → **Okta**

## What Shieldoq uses it for

Identity compliance scans: MFA coverage, users/groups posture, audit-related signals.

## Prerequisites

- Okta admin (or app admin) able to authorize the Shieldoq OAuth app for your org.
- Free integration slot.
- Platform: `OKTA_CLIENT_ID` (and related Okta app config). Else **Not configured**.

## Connect steps

1. **Integrations** → **Okta** → **Connect**.
2. Complete Okta sign-in and consent for your org domain.
3. Return to Shieldoq; confirm **Connected**.
4. Run an identity or full scan.

## Permissions / scopes

OAuth scopes registered on the Shieldoq Okta application (typically read users, groups, factors/policies as needed for scanning).

## Customer vs platform

| Side | What |
|------|------|
| Platform | Okta OAuth client + redirect URIs |
| Customer | Authorize your Okta org |

## Verify success

Connected; identity scan completes; gaps may appear under source **Identity**.

## Disconnect

Disconnect in Shieldoq; deactivate the app assignment in Okta if desired.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Not configured | Operator sets Okta env; restart API |
| Wrong org | Reconnect with the correct Okta subdomain user |
| Limit reached | Free slot or upgrade |

Related: [Gaps and findings](../gaps-and-findings.md).
