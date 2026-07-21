# Codespaces environment URLs

Current Codespace: `supreme-telegram-6v6pw6w79jghx74`

| Service  | Port | URL |
|----------|------|-----|
| Frontend | 3000 | https://supreme-telegram-6v6pw6w79jghx74-3000.app.github.dev |
| API      | 4000 | https://supreme-telegram-6v6pw6w79jghx74-4000.app.github.dev |

## One-time setup in the Codespace terminal

```bash
# 1. Pull latest (CORS + env fixes)
git pull origin main

# 2. Web env (Next.js reads .env.local)
cp apps/web/.env.example apps/web/.env.local

# 3. API env (NestJS reads .env) — keep secrets; only overwrite URL keys if needed
# If you already have apps/api/.env, update these keys instead of full overwrite:
#   APP_URL, WEB_URL, CORS_ORIGINS, GOOGLE_CALLBACK_URL
cp apps/api/.env.example apps/api/.env   # only if you do not already have .env

# 4. Ports tab → set 3000 and 4000 to Public

# 5. Restart
# terminal A
cd apps/api && npm run start:dev
# terminal B
cd apps/web && npm run dev
```

## Required web variables

```env
NEXT_PUBLIC_API_URL=https://supreme-telegram-6v6pw6w79jghx74-4000.app.github.dev/api/v1
NEXT_PUBLIC_SITE_URL=https://supreme-telegram-6v6pw6w79jghx74-3000.app.github.dev
```

## Required API variables

```env
APP_URL=https://supreme-telegram-6v6pw6w79jghx74-4000.app.github.dev
WEB_URL=https://supreme-telegram-6v6pw6w79jghx74-3000.app.github.dev
CORS_ORIGINS=https://supreme-telegram-6v6pw6w79jghx74-3000.app.github.dev,http://localhost:3000,http://127.0.0.1:3000
GOOGLE_CALLBACK_URL=https://supreme-telegram-6v6pw6w79jghx74-4000.app.github.dev/api/v1/auth/google/callback
```

If the Codespace name changes, replace `supreme-telegram-6v6pw6w79jghx74` in every URL.
