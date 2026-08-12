# Azure AD (Microsoft Entra ID)

**Category:** Identity  
**Connect type:** OAuth  
**Path:** Integrations → Identity → **Azure AD**

## What Vikela uses it for

Directory / identity posture: conditional access signals, sign-in related compliance checks, MFA and user posture as implemented by the identity scanner.

This is separate from the **Azure** cloud integration (subscriptions / cloud resources).

## Prerequisites

- Work/school Entra account with rights to consent to the Vikela app.
- Free integration slot.
- Platform: `AZURE_AD_CLIENT_ID` or shared `AZURE_CLIENT_ID`. Else **Not configured**.

## Connect steps

1. **Integrations** → **Azure AD** → **Connect**.
2. Sign in and grant consent.
3. Confirm **Connected**.
4. Run identity or full scan.

## Permissions / scopes

Microsoft Graph permissions configured on the Vikela app (directory read, policy read, etc. as deployed).

## Customer vs platform

| Side | What |
|------|------|
| Platform | Azure AD / Entra app registration |
| Customer | Tenant admin consent when required |

## Verify success

Connected; identity findings on Gaps/Scans.

## Disconnect

Disconnect in Vikela; revoke under Entra → Enterprise applications.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Admin consent required | Entra admin grants consent |
| Not configured | Set `AZURE_AD_CLIENT_ID` / `AZURE_CLIENT_ID`; restart API |
| Confused with Azure cloud | Use **Azure** card for subscriptions; **Azure AD** for identity |

Related: [Azure cloud](./azure.md).
