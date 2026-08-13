# Team and access

**Path:** Sidebar → **Team** (`/team`), **hidden for auditors**  
**Who:** **Admin** manages invites and roles. Members see limited team context.

## Purpose

Invite people, assign roles, revoke pending invites, and watch **seat** usage against your plan.

## Roles

| App role | Clerk / API mapping (typical) | Access summary |
|----------|-------------------------------|----------------|
| **Admin** | `admin` / OWNER\|ADMIN | Full: integrations, scans, settings, billing, team, delete org |
| **Member** | default / MEMBER | Write: gaps, evidence, policies, scans, remediation, Copilot |
| **Auditor** | `auditor` / AUDITOR | Read-only shell; **export evidence**; blocked from scans, integrations, settings, billing, team, onboarding |

### Auditor-hidden routes

`/scans`, `/integrations`, `/settings`, `/billing`, `/team`, `/onboarding`

## Primary workflows

### Invite

1. Open **Team**.
2. Invite by email; choose role: Member, Admin, or Auditor.
3. Pending invites count toward **seats**.
4. Invitee accepts via email/Clerk flow and joins the org.

### Change role / revoke

1. Change role from the member row (admin only).
2. Revoke a pending invite to free a seat.

### Seat limits

Seats = **active members + pending invites**. Limits:

| Plan | Seats |
|------|-------|
| Free | 3 |
| Starter | 10 |
| Growth | 25 |
| Enterprise | 100 |

Upgrade under [Billing](./billing.md) if invites fail due to seat cap.

> **Screenshot:** Team page with seat meter and invite dialog

## Related entities

- [Billing](./billing.md)  
- [Settings](./settings.md) (SSO/MFA coming soon flags)  
- [Training](./training.md) assignments to members  

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Invite 403 | You are not admin |
| Seat limit | Revoke pending invites or upgrade |
| Auditor sees empty nav sections | Expected, read-only shell |
| User in wrong org | Switch Clerk organization |

Back to [User guide index](./README.md).
