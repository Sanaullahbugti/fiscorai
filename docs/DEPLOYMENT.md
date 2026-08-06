# Production deployment (zero-cost)

Stack: **Render** (API + static web) + **Neon** Postgres + **Cloudflare R2** + **Lemon Squeezy live** + **fiscorai.com**.

## 1. Neon (database)

1. Create a free project at [neon.tech](https://neon.tech) (EU region if available).
2. Copy the **pooled** connection string (`?sslmode=require`).
3. In Render → **fiscorai** API → Environment → set `DATABASE_URL` (secret).

Migrations run on deploy: `prisma migrate deploy` (see `render.yaml` `startCommand`).

## 2. Cloudflare R2 (VAT files)

1. Cloudflare dashboard → R2 → Create bucket (e.g. `fiscorai-uploads`).
2. R2 → Manage R2 API tokens → Create token with Object Read & Write.
3. On Render API, set:

| Variable | Value |
|----------|--------|
| `STORAGE_BACKEND` | `r2` |
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | Token access key |
| `R2_SECRET_ACCESS_KEY` | Token secret |
| `R2_BUCKET` | Bucket name |

Local dev keeps `STORAGE_BACKEND=local` and `STORAGE_ROOT=../../storage`.

## 3. Custom domain

**Render → fiscorai-web:** add `fiscorai.com`, `www.fiscorai.com`  
**Render → fiscorai (API):** add `api.fiscorai.com`

Point DNS at your registrar to the targets Render provides.

**Web build env** (Render → fiscorai-web): `VITE_API_URL=https://api.fiscorai.com` (rebuild after change).

**API env:**

```
CORS_ORIGIN=https://fiscorai.com,https://www.fiscorai.com
PAYMENT_SUCCESS_URL=https://fiscorai.com/thankyou
PAYMENT_CANCEL_URL=https://fiscorai.com/payment-failed
```

## 4. Lemon Squeezy (live)

1. Store in **Live** mode (not Test).
2. Three monthly subscription variants: Basic / Standard / Pro (prices in `shared/plans.ts`).
3. Webhook URL: `https://api.fiscorai.com/api/v1/webhook/`
4. Subscribe to: `subscription_created`, `subscription_updated`, `subscription_cancelled`, `subscription_expired`, `subscription_resumed`, `subscription_payment_success`, `subscription_payment_failed`.
5. Set on Render API:

```
LEMONSQUEEZY_API_KEY
LEMONSQUEEZY_STORE_ID
LEMONSQUEEZY_WEBHOOK_SECRET
LEMONSQUEEZY_VARIANT_BASIC
LEMONSQUEEZY_VARIANT_STANDARD
LEMONSQUEEZY_VARIANT_PRO
```

## 5. Smoke test

1. `https://api.fiscorai.com/health` → `{"ok":true}`
2. Register → upload CSV → dashboard shows data
3. Redeploy API → data still present (Neon + R2)
4. Billing → checkout → `/thankyou` → plan active
5. `https://fiscorai.com/blog/` serves HTML (not SPA shell)

## Local `.env` reference

Copy `apps/api/.env.example` → `apps/api/.env` and fill:

- `DATABASE_URL` — Neon URL or `postgresql://postgres:postgres@localhost:5432/fiscorai_dev`
- `STORAGE_BACKEND=local` for dev
- Lemon keys for local checkout testing (test or live)
