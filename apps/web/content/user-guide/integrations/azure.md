# Azure (Microsoft Azure cloud)

**Category:** Cloud  
**Connect type:** OAuth  
**Path:** Integrations → Cloud → **Azure**

## What Shieldoq uses it for

Cloud posture related to Azure subscriptions (RBAC, Monitor, Defender-related signals as implemented by the scanner).

## Prerequisites

- A **work or school** Microsoft Entra ID account (personal Microsoft accounts are typically blocked for Azure cloud connect).
- At least one **Azure subscription** in the tenant you authorize. A directory with zero subscriptions cannot complete a useful connect.
- Free integration slot.
- Platform: `AZURE_CLIENT_ID` or `AZURE_CLOUD_CLIENT_ID` (and secrets). Else **Not configured**.

## Connect steps

1. **Integrations** → **Azure** → **Connect**.
2. Sign in with your **Entra work/school** account.
3. Consent to the requested Microsoft Graph / Azure permissions.
4. Return to Shieldoq; confirm **Connected**.

> **Screenshot:** Microsoft consent screen for Shieldoq Azure app

## Permissions / scopes

Configured on the Shieldoq Azure AD app registration (directory read, subscription access as required for scanning). Your operator defines exact scopes.

## Customer vs platform

| Side | What |
|------|------|
| Platform | Azure OAuth app (client ID/secret), redirect URIs |
| Customer | Authorize a tenant that has subscriptions |

## Verify success

Connected card; cloud/full scan runs against the linked subscription context.

## Disconnect

Disconnect in Shieldoq; revoke the enterprise app under Entra ID → Enterprise applications if desired.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Personal account blocked | Use a work/school Entra user |
| “No subscriptions in Default Directory” | Create or link an Azure subscription to that tenant |
| Not configured | Set Azure client env vars; restart API |
| Consent / admin approval required | Ask Entra admin to grant admin consent |
| Limit reached | Free slot or upgrade |

Related: [Azure AD (identity)](./azure-ad.md) (directory/identity scans, separate card).
