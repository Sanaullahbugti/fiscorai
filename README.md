# FiscorAI

Amazon EU VAT analyser — local dev + zero-cost production on Render.

## Quick start (local)

```bash
cd fiscorai
pnpm install
cp apps/api/.env.example apps/api/.env
# Set DATABASE_URL to Neon pooled URL or local Postgres (see Production)
pnpm db:migrate
pnpm --filter @fiscorai/tax-processor build
pnpm dev
```

- Web: http://localhost:5173
- API: http://localhost:9292
- Uploads: `./storage/{user-email}/...` (`STORAGE_BACKEND=local`)

**Tests** need Postgres (`TEST_DATABASE_URL` or `DATABASE_URL`). CI uses a service container; locally:

```bash
docker run -d --name fiscorai-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=fiscorai_test -p 5432:5432 postgres:16-alpine
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fiscorai_test
pnpm db:migrate && pnpm test
```

## Production ($0 stack)

| Layer | Service |
|-------|---------|
| Web | Render static — `https://fiscorai.com` |
| API | Render free — `https://api.fiscorai.com` |
| DB | [Neon](https://neon.tech) free Postgres |
| Files | [Cloudflare R2](https://developers.cloudflare.com/r2/) free bucket |
| Payments | Lemon Squeezy **live** |

See [`render.yaml`](render.yaml) and [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for env vars and DNS.

### DNS (`fiscorai.com`)

In your DNS host (GoDaddy, etc.):

| Host | Type | Target |
|------|------|--------|
| `@` | CNAME or A | Render custom domain for **fiscorai-web** |
| `www` | CNAME | Render custom domain for **fiscorai-web** |
| `api` | CNAME | Render custom domain for **fiscorai** API |

Add custom domains in Render dashboard for each service, then paste the records Render shows.

## Blog (`apps/web/public/blog/`)

Static HTML served from `apps/web/dist/blog/`. Render static sites serve files before the SPA `/*` rewrite, so blog URLs work for crawlers.

New post: add `apps/web/public/blog/<slug>/index.html`, update `blog/index.html`, `sitemap.xml`, and `llms.txt`.

## Billing / Lemon Squeezy (live)

Paid plans checkout through Lemon (Merchant of Record). Webhooks sync subscription state.

1. Lemon dashboard → **Live mode** → subscription product with variants matching `shared/plans.ts` (€14.90 / €39.90 / €79.90).
2. Webhook: `POST https://api.fiscorai.com/api/v1/webhook/` — events: `subscription_*`, `subscription_payment_*`.
3. Set on Render API (secrets): `LEMONSQUEEZY_API_KEY`, `STORE_ID`, `WEBHOOK_SECRET`, three `VARIANT_*` ids.
4. `PAYMENT_SUCCESS_URL=https://fiscorai.com/thankyou`, `PAYMENT_CANCEL_URL=https://fiscorai.com/payment-failed`.

Cancel is at period end via Lemon portal; `subscription_expired` drops user to Free.
