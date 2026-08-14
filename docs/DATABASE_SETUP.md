# Database setup (Supabase vs local)

## Why `db.jqiookzfrhraalikkpst.supabase.co` fails locally

That host is often **IPv6-only**. If your network has no IPv6 route, Prisma reports **P1001 Can't reach database server**.

Use the **Session pooler** URI (port **5432**, user `postgres.PROJECT_REF`) or enable **IPv4** in Supabase → Database → Settings.

## Supabase `.env` (remote)

Use **one** `DATABASE_URL` and matching `DIRECT_URL` from **Connect → Session pooler** (ends with `:5432`):

```env
DATABASE_URL=postgresql://postgres.jqiookzfrhraalikkpst:YOUR_PASSWORD@aws-1-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require
DIRECT_URL=postgresql://postgres.jqiookzfrhraalikkpst:YOUR_PASSWORD@aws-1-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require
```

Then:

```bash
npm run db:migrate
npm run db:seed
```

If you get **authentication** errors: reset the database password in Supabase and paste the new value into both URLs.

## Local Docker (recommended for dev)

1. Start **Docker Desktop**
2. Run:

```bash
npm run db:local
```

3. Point `.env` at local Postgres for day-to-day dev:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/shieldoq
DIRECT_URL=postgresql://postgres:postgres@localhost:5432/shieldoq
REDIS_URL=redis://localhost:6379
```

4. `npm run dev`

## Test connection

```bash
chmod +x scripts/test-db-connection.sh
./scripts/test-db-connection.sh
```
