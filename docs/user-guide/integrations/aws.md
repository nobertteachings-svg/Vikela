# AWS

**Category:** Cloud  
**Connect type:** AssumeRole (Role ARN) — **never** long-lived customer access keys  
**Path:** Integrations → Cloud → **AWS**

## What Vikela uses it for

Cloud compliance scans via temporary credentials from STS AssumeRole, including checks such as:

- IAM (e.g. MFA, stale access keys)
- CloudTrail
- S3 (public access, encryption)
- GuardDuty
- Security groups

Findings feed **gaps** and control readiness.

## Prerequisites

- Ability to create an IAM role in **your** AWS account (admin).
- An AWS account / subscription you intend to scan.
- Free integration slot.
- Vikela platform STS identity configured (`AWS_VIKELA_*`). The Connect dialog is always shown; connect fails honestly if platform STS is missing (unless demo mode).

## Connect steps

1. Open **Integrations** → **AWS** → **Connect**.
2. In the dialog, follow instructions to deploy Vikela’s CloudFormation / IAM policy so your account has a role Vikela can assume.
   - Operators can also expose a template via `GET /api/v1/aws/cloudformation-template`.
3. Copy the **Role ARN** created in your account.
4. Paste the Role ARN (and External ID if shown — often `vikela-scanner` or your org’s configured value).
5. Submit. Vikela calls AssumeRole to verify.
6. Card shows **Connected**.

> **Screenshot:** Connect AWS dialog with Role ARN field

## Permissions / trust

- Trust policy must allow Vikela’s platform AWS principal to `sts:AssumeRole`, typically with an **ExternalId** condition.
- Permissions policy should match the scanner assume policy your operator provides (read-only security posture checks).

## Customer vs platform

| Side | What |
|------|------|
| Platform | `AWS_VIKELA_ACCESS_KEY_ID`, `AWS_VIKELA_SECRET_ACCESS_KEY`, `AWS_VIKELA_ACCOUNT_ID`, `AWS_EXTERNAL_ID` |
| Customer | Role ARN in your account; no long-lived keys pasted into Vikela |

## Verify success

- Connected status.
- Run a cloud or full scan; completed scan with cloud findings (or clean result) appears under **Scans** / **Gaps**.

## Disconnect

Disconnect from Integrations. Optionally delete the IAM role/stack in AWS.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| AssumeRole denied | Fix trust policy, External ID, and Vikela account ID |
| Platform not ready | Operator configures `AWS_VIKELA_*` |
| No findings | Confirm role permissions cover IAM/S3/CloudTrail/etc.; confirm region expectations |
| Limit reached | Free a slot or upgrade |

Related: [Gaps and findings](../gaps-and-findings.md), [Integrations overview](./README.md).
