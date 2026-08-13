# Settings

**Path:** Sidebar → **Settings** (`/settings`), **admin only** (auditors blocked)  
**Who:** Admin (OWNER/ADMIN).

## Purpose

Organization profile, notifications, security preferences, API keys, outbound webhooks, and danger-zone exports/deletion.

## Tabs

### 1. General

- Edit **organization name** (saved to backend).
- View org **slug**.
- Preview **Trust center** URL (`/trust`).
- Other profile fields may be local UI until fully wired, confirm saves succeed.

### 2. Notifications

Preferences such as:

- Gap alerts  
- Scan complete  
- Weekly digest (email may show **Coming soon**)  
- Member invites  

Save preferences; email delivery depends on platform email configuration.

### 3. Security

- **MFA required**: saved; enforcement may show **Coming soon**.  
- **SSO enforced** / SAML. Coming soon where labeled.  
- **IP allowlist** for API keys (`vk_…` keys).

### 4. API Keys

- Create **read-scoped** API keys for automation.
- Secret shown **once**: store securely.
- Revoke compromised keys immediately.

### 5. Webhooks

- Register outbound endpoints for org events.
- **Test** delivery; delete unused endpoints.

### 6. Danger zone

- Export org data (JSON / CSV / PDF via HTML print flows as offered).
- **Delete organization**: type the org slug to confirm. Irreversible.

> **Screenshot:** Settings tabs with Danger zone confirm

## Related entities

- [Trust center](./getting-started.md#trust-center)  
- [Team and access](./team-and-access.md)  
- [Billing](./billing.md)  

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| 403 / redirect | You are not admin |
| API key lost | Revoke and create a new key |
| Webhook test fails | Check URL HTTPS, firewall, and signing expectations |
| Delete blocked | Type exact slug; ensure you are the authorized admin |

Back to [User guide index](./README.md).
