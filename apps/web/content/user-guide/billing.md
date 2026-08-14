# Billing

**Path:** Sidebar → **Billing** (`/billing`), **admin only** (auditors blocked)  
**Who:** Admin.

## Purpose

View plan, usage meters, upgrade via Stripe Checkout, manage payment methods/invoices in the Stripe Customer Portal, or contact sales for Enterprise.

## Plans (enforced limits)

| Plan | Price (list) | Seats | Integrations | Scans / month | Evidence storage |
|------|--------------|-------|--------------|---------------|------------------|
| Free | $0 | 3 | 1 | 5 | 100 MB |
| Solo | $59/mo ($49/mo annual) | 3 | 2 | 15 | 256 MB |
| Starter | $329/mo ($274/mo annual) | 10 | 5 | 50 | 1 GB |
| Growth | $949/mo ($789/mo annual) | 25 | 20 | 500 | 5 GB |
| Enterprise | Custom | 100 | 999 | High | 50 GB |

List prices appear in the billing UI (monthly/annual toggle); marketing copy says “compliance checks” for the same meter the product calls scans. Enterprise uses **Contact sales**. Copilot, policy generator, evidence exports, and questionnaires require **Growth** or higher. SSO is available on Enterprise plans.

### Usage rules

- **Seats:** members + pending invites.  
- **Integrations:** distinct **active** providers.  
- **Scans:** billable parent scans in the current **UTC** calendar month.  
- **Evidence:** storage approximated against plan MB; item count may show separately.

Exceeding limits returns upgrade messaging (HTTP 402).

## Status badges

| Status | Meaning |
|--------|---------|
| Free | On Free plan |
| Active | Paid subscription active |
| Trialing | Trial period |
| Past due / Unpaid | Update payment method ASAP |
| Complimentary | Comped / manually granted |

## Primary workflows

### Upgrade or switch (Starter / Growth)

1. Open **Billing**.
2. Review usage meters.
3. Choose **Upgrade** / **Switch** / **Activate** on Starter or Growth.
4. Complete **Stripe Checkout**.
5. Return to Shieldoq; confirm plan badge and higher limits.

### Manage payment & invoices

Use **Billing portal** (Stripe) for payment method, invoices, and cancellation flows offered there.

### Enterprise

Click **Contact sales** and complete the sales form/email flow.

> **Screenshot:** Billing page with usage meters and plan cards

## Related entities

- [Team and access](./team-and-access.md) (seats)  
- [Integrations overview](./integrations/README.md) (integration cap)  
- [Evidence](./evidence.md) (storage)  
- [Getting started](./getting-started.md) (scans)  

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Checkout banner / failed return | Re-open Billing; confirm Stripe webhook processed; retry portal |
| Still on Free after payment | Wait briefly; refresh; contact support with Stripe receipt |
| Integration limit on Starter | Disconnect unused provider or upgrade to Growth |
| Past due | Update card in portal |
| Marketing copy says “unlimited” | Trust **enforced** limits in this table |

Back to [User guide index](./README.md).
