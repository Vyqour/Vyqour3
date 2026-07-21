# Codespaces environment + login fix

Current Codespace: `supreme-telegram-6v6pw6w79jghx74`

| Service  | Port | Public URL |
|----------|------|------------|
| Frontend | 3000 | https://supreme-telegram-6v6pw6w79jghx74-3000.app.github.dev |
| API      | 4000 | http://127.0.0.1:4000 inside the Codespace (proxied by Next) |

## Why login showed "Failed to fetch"

1. Browser called the **public** `-4000` URL (cross-origin).
2. Port 4000 was often **down (502)** or behind the tunnel → `fetch` failed.
3. Even when up, CORS/preflight across Codespace hosts broke credentialed POSTs.

## Fix (already in repo)

- Browser uses **same-origin** `NEXT_PUBLIC_API_URL=/api/v1`
- `next.config.ts` rewrites `/api/v1/*` → `INTERNAL_API_URL` (`http://127.0.0.1:4000`)
- Nest CORS still allows localhost + `*.app.github.dev` for direct API access

## Setup

```bash
git pull origin main

# Web
cp apps/web/.env.local.codespaces apps/web/.env.local
# or: cp apps/web/.env.example apps/web/.env.local

# API — keep your secrets; ensure Nest listens on 4000
# apps/api/.env must exist with DATABASE_URL + JWT secrets

# Terminal A — API MUST stay running
cd apps/api && npm run start:dev

# Terminal B — restart web after env change
cd apps/web && npm run dev
```

## Verify

```bash
# API healthy inside Codespace
curl -sS http://127.0.0.1:4000/api/v1/health

# Same-origin proxy via Next
curl -sS http://127.0.0.1:3000/api/v1/health

# Login
curl -sS -X POST http://127.0.0.1:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@vyqour.com","password":"VyqourAdmin@2026"}'
```

If health on `:4000` fails, login will always show Failed to fetch / API not reachable — start Nest first.

Ports: set **3000** Public for the browser. Port **4000** can stay private when using the proxy.
