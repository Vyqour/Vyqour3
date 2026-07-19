# VYQOUR — Wear Your Identity.

Premium Print-on-Demand fashion e-commerce platform for India (INR).

**Stack:** Next.js 15 · NestJS · PostgreSQL · Prisma · Redis · JWT · Cloudinary · Razorpay-ready

---

## Monorepo

```
vyqour/
├── apps/
│   ├── web/          # Next.js storefront + admin (Vercel)
│   └── api/          # NestJS REST API (Render)
├── docker-compose.yml
├── render.yaml
└── package.json
```

## Qikink POD + payments

Full production module: `apps/api/src/modules/qikink/`  
Docs: [`docs/QIKINK_INTEGRATION.md`](docs/QIKINK_INTEGRATION.md)

- Auto-submit **COD** on confirm and **Prepaid** only after Razorpay verify/webhook
- Durable job queue, retries, idempotency, API + webhook audit logs
- Inbound Qikink status webhooks + optional status polling
- Admin UI: `/admin/qikink`
- Env: `QIKINK_*`, `RAZORPAY_*` (see `apps/api/.env.example`)

## Features

### Storefront
- Home, Shop (filters/sort/search), Collections, Accessories
- Product detail (variants, gallery, wishlist, share, JSON-LD SEO)
- Cart + coupons · Checkout (COD + Razorpay-ready)
- Auth: email/password, Google OAuth, verify email, forgot/reset password
- Account: orders, addresses, wishlist, settings, delete account
- Track order · Blog · FAQ · Legal pages · 404
- Dark luxury UI (Apple × Nike × Nothing), Framer Motion, glassmorphism

### Admin (`/admin`)
- Dashboard analytics · Products · Orders · Users · Coupons
- Categories · Reviews · Media · Settings
- Role-based access (ADMIN / SUPER_ADMIN / SUPPORT)

### API (`/api/v1`)
- JWT access + refresh cookies · RBAC · Throttling · Helmet · Validation
- Swagger docs at `/api/v1/docs`
- Modules: auth, products, categories, cart, wishlist, orders, payments,
  coupons, reviews, users, addresses, blog, newsletter, notifications, media, admin

---

## Quick start

### 1. Prerequisites
- Node.js 20+
- Docker (for Postgres + Redis) **or** Neon/Supabase Postgres URL

### 2. Install

```bash
cd vyqour
npm install
```

### 3. Infrastructure

```bash
docker compose up -d
```

### 4. Environment

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

Set at minimum in `apps/api/.env`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/vyqour?schema=public
JWT_ACCESS_SECRET=change-me-access-secret-min-32-chars-long!!
JWT_REFRESH_SECRET=change-me-refresh-secret-min-32-chars-long!
```

### 5. Database

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

Seed accounts:
| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@vyqour.com | VyqourAdmin@2026 |
| Demo customer | demo@vyqour.com | Demo@1234 |

Coupons: `VYQOUR10` · `FREESHIP` · `IDENTITY500`

### 6. Run

```bash
# Terminal 1 — API http://localhost:4000
npm run dev:api

# Terminal 2 — Web http://localhost:3000
npm run dev:web
```

- Store: http://localhost:3000  
- Admin: http://localhost:3000/admin  
- API health: http://localhost:4000/api/v1/health  
- Swagger: http://localhost:4000/api/v1/docs  

---

## Deployment

### Frontend → Vercel
1. Import repo, root `apps/web`
2. Env: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`
3. Region: `bom1` (Mumbai) recommended

### Backend → Render
1. Use `render.yaml` or connect `apps/api`
2. Set env vars from `.env.example`
3. Attach managed Postgres (or Neon)

### Database
- Neon / Supabase PostgreSQL (production)
- Redis optional (caching degrades gracefully if offline)

### Media
- Cloudinary credentials in API env

### Payments
- Razorpay keys enable live UPI/Card; without keys, mock verify works in dev

---

## Brand

| | |
|--|--|
| Name | **VYQOUR** |
| Tagline | *Wear Your Identity.* |
| Audience | 16–30 · India |
| Currency | INR (₹) |
| Theme | Dark · Luxury · Minimal |
| Colors | BG `#0B0B0B` · Primary `#5B21B6` · Secondary `#2563EB` |

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev:web` | Next.js dev server |
| `npm run dev:api` | NestJS watch mode |
| `npm run build` | Build all workspaces |
| `npm run db:migrate` | Prisma migrate |
| `npm run db:seed` | Seed catalog + admin |
| `npm run db:up` | Docker Postgres + Redis |

---

## Security

- bcrypt password hashing (12 rounds)
- JWT access (15m) + rotating refresh tokens
- HttpOnly cookies · CORS allowlist · Helmet · rate limit
- class-validator DTO whitelist · RBAC guards
- SQL injection protection via Prisma

## SEO

- Dynamic metadata · Open Graph · JSON-LD Product
- `sitemap.xml` · `robots.txt` · canonical URLs

---

Built as a production-ready foundation for VYQOUR POD commerce.
