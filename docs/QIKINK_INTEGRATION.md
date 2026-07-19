# VYQOUR × Qikink Integration

Production fulfillment module for [Qikink](https://qikink.com) Print-on-Demand (Custom API **08-23**).

Official reference: [Qikink Postman docs](https://documenter.getpostman.com/view/26157218/2sB3QKqpma)

---

## Architecture

```
Checkout / Payment
       │
       ▼
 OrdersService ──COD confirmed──► QikinkService.enqueueOrderSubmission()
 PaymentsService ─PAID/webhook──► QikinkService.enqueueOrderSubmission()
       │
       ▼
 QikinkJob (DB queue, idempotent)
       │
       ▼
 QikinkWorker (interval + cron)
       │
       ▼
 QikinkApiClient ──HTTPS──► sandbox.qikink.com | api.qikink.com
       │
       ├── POST /api/token
       ├── POST /api/order/create
       ├── GET  /api/order/status   (optional / account-dependent)
       └── GET  /api/products       (optional / account-dependent)

Inbound:
 POST /api/v1/qikink/webhooks          ← fulfillment/status (HMAC)
 POST /api/v1/payments/webhooks/razorpay ← payment.captured → Qikink submit
```

Clean boundaries:

| Layer | Responsibility |
|--------|----------------|
| `client/qikink-api.client.ts` | Auth token cache, HTTP, rate-limit aware retries on 401, API logs |
| `qikink-order.mapper.ts` | Order → Qikink payload, status mapping, ≤15 char order numbers |
| `queue/qikink-job.queue.ts` | Durable jobs, claim/lock, exponential backoff, dead-letter |
| `qikink.service.ts` | Business rules, idempotency, webhooks, product sync |
| `qikink.worker.ts` | Background processor + status poll cron |

---

## Environment

```env
QIKINK_ENABLED=true
QIKINK_SANDBOX=true
QIKINK_CLIENT_ID=...                 # dashboard → Integration → Custom API
QIKINK_CLIENT_SECRET=...             # Live secret
QIKINK_SANDBOX_SECRET=...            # Sandbox secret (different from Live)
QIKINK_SHIPPING=1                    # 1 = Qikink ships, 0 = self ship
QIKINK_WEBHOOK_SECRET=...            # HMAC-SHA256 for X-Qikink-Signature
QIKINK_AUTO_SUBMIT=true
QIKINK_MAX_ATTEMPTS=8
QIKINK_WORKER_INTERVAL_MS=15000
QIKINK_STATUS_POLL_ENABLED=true

# Payments (prepaid automation)
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...          # defaults to key secret if unset
```

Credentials are **only** read from env — never hardcoded.

---

## Auth (Qikink)

1. `POST {base}/api/token` as **form-urlencoded**:
   - `ClientId`
   - `client_secret`
2. Response includes `Accesstoken` + `expires_in`.
3. All other calls send headers:
   - `ClientId`
   - `Accesstoken`
4. Token is cached in-memory and refreshed on 401 / expiry.
5. Rate limit: **30 req/min** (client logs failures; worker backoff spreads load).

Bases:

- Sandbox: `https://sandbox.qikink.com`
- Live: `https://api.qikink.com` (request Live access in dashboard)

---

## Order automation

### COD
1. Customer places COD order → status `CONFIRMED`.
2. Confirmation email sent.
3. `enqueueOrderSubmission` → job `SUBMIT_ORDER`.
4. Worker builds payload with `gateway: "COD"` and calls Create Order.
5. Stores `qikinkOrderId`, moves store order to `PROCESSING`.

### Prepaid (Razorpay)
1. Order created with `paymentStatus=PENDING` — **not** sent to Qikink.
2. Client verifies signature **or** Razorpay webhook `payment.captured` / `order.paid`.
3. `markOrderPaid` (idempotent by `gatewayPaymentId`).
4. Only then enqueue Qikink with `gateway: "Prepaid"`.
5. Unpaid prepaid submit attempts are rejected.

### Idempotency / no duplicates
- `qikinkIdempotencyKey` unique per order.
- `qikinkOrderId` unique — submit short-circuits if set.
- Job queue dedupes in-flight `SUBMIT_ORDER` per order.
- Razorpay webhook dedupes on `gatewayPaymentId`.
- Webhook events dedupe on `eventId`.

---

## Payload rules (Create Order)

From official docs + production notes:

| Field | Rule |
|--------|------|
| `order_number` | **≤ 15 chars**, unique (we compress internal VYQ numbers) |
| `gateway` | `COD` or `Prepaid` |
| `qikink_shipping` | `0` or `1` |
| `quantity`, `price`, `total_order_value` | sent as **strings** |
| `search_from_my_products` | `1` = My Products SKU (Live); `0` = blank SKU + designs |
| Sandbox | Often requires `search_from_my_products: 0` + design fields |

Line items pull:

1. `variant.qikinkSku` → else `product.qikinkSku` → else local SKU  
2. Design fields from product when `search_from_my_products=0`

---

## Product / price sync

**Limitation (documented):**  
Public Qikink API 08-23 documents **Authorization** + **Create Order** thoroughly. A universal product-list endpoint is **not** guaranteed on Sandbox and may require Live Custom API approval.

**What we implement:**

1. `POST /api/v1/qikink/products/sync` tries `GET /api/products` (configurable via `QIKINK_PRODUCTS_ENDPOINT`).
2. On success → upsert `QikinkProductCatalog` and soft-match local `Product` / `ProductVariant` by SKU; updates `qikinkSku` / `qikinkPrice`.
3. On failure → returns structured limitation message (does not crash).
4. **Closest supported alternative:** map SKUs in admin  
   - `PATCH /qikink/products/:id/mapping`  
   - `PATCH /qikink/variants/:id/mapping`  
   - Admin UI: **Admin → Qikink**

---

## Status / tracking sync

### Webhooks (preferred)
`POST /api/v1/qikink/webhooks`

Flexible JSON body (account-specific forwarding supported):

```json
{
  "event": "order.status",
  "order_id": "1234567890",
  "order_number": "VABC123",
  "status": "Shipped",
  "awb": "TRACK123",
  "courier": "Delhivery"
}
```

Optional HMAC: header `X-Qikink-Signature: <hex>` = `HMAC_SHA256(rawBody, QIKINK_WEBHOOK_SECRET)`.

Updates:

- `qikinkStatus`, `qikinkAwb`, `trackingNumber`, `carrier`
- Internal `OrderStatus` (`PROCESSING` → `SHIPPED` → `OUT_FOR_DELIVERY` → `DELIVERED`)
- Shipping email when first marked shipped
- Audit log + `QikinkWebhookEvent` row

### Polling (fallback)
Cron every 30 minutes enqueues `SYNC_ORDER_STATUS` for open Qikink orders.  
Calls configurable `QIKINK_STATUS_ENDPOINT` (default `/api/order/status`).  
If endpoint is unavailable for the account, the job soft-skips (webhooks remain source of truth).

**Limitation:** Public Postman collection does not fully specify status/list endpoints for all tenants. Webhooks + dashboard remain the reliable channel; polling is best-effort.

---

## Retries, logging, audit

- Exponential backoff: `15s * 2^attempt` (cap 1h), default 8 attempts → `DEAD`
- Admin retry: `POST /qikink/orders/:id/retry` (will not double-submit if `qikinkOrderId` exists)
- Tables: `qikink_jobs`, `qikink_api_logs`, `qikink_webhook_events`, `audit_logs`
- Every outbound call logged with duration/status

---

## Admin API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/qikink/health` | Enabled flags |
| POST | `/qikink/webhooks` | Public webhook |
| POST | `/qikink/orders/:id/submit` | Queue submit |
| POST | `/qikink/orders/:id/retry` | Retry failed |
| POST | `/qikink/orders/:id/sync-status` | Queue status poll |
| GET | `/qikink/orders/:id` | Fulfillment detail |
| POST | `/qikink/products/sync` | Catalog sync attempt |
| GET | `/qikink/products/catalog` | Cached catalog |
| GET | `/qikink/jobs` | Job list |
| GET | `/qikink/logs` | API logs |
| PATCH | `/qikink/products/:id/mapping` | Map product SKU/design |
| PATCH | `/qikink/variants/:id/mapping` | Map variant SKU |

---

## Go-live checklist

1. Request **Live** Custom API in Qikink dashboard if needed.  
2. Set env secrets; `QIKINK_ENABLED=true`, `QIKINK_SANDBOX=false`.  
3. Map every sellable variant’s `qikinkSku` to Qikink **My Products** SKUs.  
4. Place Sandbox test orders with `search_from_my_products=0` if blanks required.  
5. Configure Razorpay webhook → `/api/v1/payments/webhooks/razorpay`.  
6. Point Qikink/status middleware → `/api/v1/qikink/webhooks` with shared secret.  
7. Watch Admin → Qikink jobs/logs on first real orders.

---

## Emails

| Event | Method |
|--------|--------|
| Order placed | `sendOrderConfirmation` |
| Shipped (webhook/poll) | `sendShippingNotification` |

---

*Module path: `apps/api/src/modules/qikink/`*
