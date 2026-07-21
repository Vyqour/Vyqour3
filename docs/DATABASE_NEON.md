# Fix: `prisma:error Error in PostgreSQL connection: Error { kind: Closed }`

## What it means

Prisma opened a TCP session to Postgres, then the server (usually **Neon pooler / PgBouncer**) closed it. Login/register then fail because every auth query needs the DB.

## Fix `apps/api/.env` (most important)

Use the **pooled** URL from the Neon dashboard and fix query params:

```env
# ✅ GOOD — pooler host + pgbouncer + low connection limit, NO channel_binding
DATABASE_URL="postgresql://USER:PASSWORD@ep-xxxx-pooler.c-11.us-east-1.aws.neon.tech/neondb?sslmode=require&pgbouncer=true&connection_limit=1"

# Non-pooler host (no "-pooler") — migrations only
DIRECT_URL="postgresql://USER:PASSWORD@ep-xxxx.c-11.us-east-1.aws.neon.tech/neondb?sslmode=require"
```

### Remove these if present

- `channel_binding=require` ← common cause of `kind: Closed` with Prisma  
- Very high `connection_limit` against Neon free/pooler  

### If Neon project was deleted / password rotated

1. Open [https://console.neon.tech](https://console.neon.tech)  
2. Copy **Connection string** → **Pooled**  
3. Paste into `DATABASE_URL` with the params above  
4. Copy **Direct** into `DIRECT_URL`  

## After editing `.env`

```bash
cd apps/api
npx prisma generate
npx prisma migrate deploy   # needs DIRECT_URL / working DB
npx prisma db seed          # optional — creates admin user
npm run start:dev
```

You should see: `Database connected` (not repeated `kind: Closed`).

## Local Postgres fallback (docker)

```bash
# from repo root
docker compose up -d postgres redis

# apps/api/.env
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/vyqour?schema=public
DIRECT_URL=postgresql://postgres:postgres@127.0.0.1:5432/vyqour?schema=public

cd apps/api
npx prisma migrate deploy
npx prisma db seed
npm run start:dev
```

## Verify

```bash
curl -sS http://127.0.0.1:4000/api/v1/health
# database should be "ok" / healthy

curl -sS -X POST http://127.0.0.1:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@vyqour.com","password":"VyqourAdmin@2026"}'
```
