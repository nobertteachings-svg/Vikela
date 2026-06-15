# Smoke run report (local API)

**Date:** 2026-05-23  
**Environment:** `http://localhost:3001` · org `demo` · `npm run dev`  
**Not a staging gate** — checklist in `STAGING_SMOKE_CHECKLIST.md` still requires deployed Web + API + Clerk + auditor inbox.

## Prerequisites found during run

| Check | Result |
|-------|--------|
| Postgres running | Required |
| `npx prisma db push` (or `migrate deploy`) | Local DB was missing `Scan.parentScanId` until push |
| `npm run db:seed` | Required — empty DB returns `"Run db:seed first"` on dashboard |

## Local API regression (`scripts/smoke-api-local.sh`)

**Result: 26/26 passed** (after seed + schema sync; copilot POST needs `{}` body)

Covers: health, core GETs, risks POST/PATCH/export, vendors POST/PATCH, training POST/PATCH/export, policies PATCH/export, copilot explain-gap.

## Staging checklist — not run here

Cannot complete sections **1–6** without:

- Filled **Web URL** + **API URL** in checklist
- Clerk staging app + `org:auditor` + webhooks
- Real sign-up / lite scan / gap resolve in browser
- Auditor invite email + ZIP export
- Resend / PostHog verification

**Your action:** Copy checklist → run on Railway/Vercel → fill Results summary + gap ID + scan ID → green sheet → demo script.

## Fix queue (local)

| Item | Notes |
|------|--------|
| Migration baseline | Local DB hit P3005 on `migrate deploy`; used `db push` for dev |
| Risk owner P1 | Deferred — `ownerId` still shows "—" in UI |
