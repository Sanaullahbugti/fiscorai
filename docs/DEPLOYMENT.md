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
| `R2_BUCKET` | Bucket name (e.g. `fiscorai-files`) |
| `R2_JURISDICTION` | Set to `eu` only if the bucket was created under **Specify jurisdiction → European Union**. Leave unset for Automatic / default buckets. Using the wrong endpoint returns `NoSuchBucket`. |

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

## 5. Transactional email (account confirm + password reset)

Mailbox: **support@fiscorai.com** (GoDaddy Professional Email / Titan).

On Render API, set:

```
WEB_APP_URL=https://fiscorai.com
EMAIL_FROM=FiscorAI <support@fiscorai.com>
EMAIL_NOTIFY_TO=sanaullahbugti821@gmail.com
SMTP_HOST=smtpout.secureserver.net
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=support@fiscorai.com
SMTP_PASS=<mailbox password from Email & Office Dashboard>
```

If SMTP is unset, the API logs email bodies instead of sending (local/dev only).

Flows:

1. Sign up → confirmation email → `/verify-email?token=…` → sign in
2. Forgot password → reset email → `/reset-password?token=…`
3. Contact form → optional copy to `EMAIL_NOTIFY_TO`

## 6. Smoke test

1. `https://api.fiscorai.com/health` → `{"ok":true}`
2. Register with a real inbox → open confirmation email → sign in
3. Forgot password → reset → sign in with new password
4. Upload CSV → dashboard shows data
5. Redeploy API → data still present (Neon + R2)
6. Billing → checkout → `/thankyou` → plan active
7. `https://fiscorai.com/blog/` serves HTML (not SPA shell)

## Local `.env` reference

Copy `apps/api/.env.example` → `apps/api/.env` and fill:

- `DATABASE_URL` — Neon URL or `postgresql://postgres:postgres@localhost:5432/fiscorai_dev`
- `STORAGE_BACKEND=local` for dev
- `SMTP_*` + `WEB_APP_URL` for real emails (optional locally)
- Lemon keys for local checkout testing (test or live)
