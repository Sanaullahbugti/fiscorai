# FiscorAI

Local-first Amazon EU VAT analyser.

## Quick start

```bash
cd fiscorai
pnpm install
cp apps/api/.env.example apps/api/.env
pnpm db:push
pnpm --filter @fiscorai/tax-processor build
pnpm dev
```

- Web: http://localhost:5173
- API: http://localhost:9292
- Uploads land in `./storage/{user-email}/...` and are processed locally.

## Blog (`apps/web/public/blog/`)

The blog is hand-authored static HTML, not part of the React SPA — it's served
as-is so crawlers and AI answer engines can read full content without running
JavaScript. Vite copies `apps/web/public/**` into the build output verbatim,
so `pnpm --filter @fiscorai/web build` picks it up automatically; nothing else
to run.

**Hosting requirement:** whatever serves the built `apps/web/dist/` in
production must check for a matching file on disk *before* falling back to
`index.html` for client-side routing (e.g. nginx's `try_files $uri $uri/
/index.html;`, or the default static-file-first behavior on Vercel/Netlify).
A naive rule that rewrites every request straight to `index.html` — bypassing
the on-disk check — will swallow `/blog/*` and serve the SPA shell instead.
No such config exists in this repo yet; whoever sets up the production host
needs to get this right, since it's the one thing that would make the blog
invisible to crawlers despite building correctly.

New post checklist: add `apps/web/public/blog/<slug>/index.html` (copy an
existing post as a template — meta tags, Open Graph, and the two JSON-LD
blocks all need updating per post), add it to `apps/web/public/blog/index.html`'s
list, `apps/web/public/sitemap.xml`, and the "Blog" section of
`apps/web/public/llms.txt`.

## Billing / Lemon Squeezy

Paid plans (Basic / Standard / Pro) check out through **Lemon Squeezy** (Merchant of Record). Lemon owns renewals; FiscorAI syncs plan state from webhooks.

**Dashboard setup (Test mode, then Live):**

1. Create a store and a subscription product with three monthly variants matching `shared/plans.ts` (€14.90 / €39.90 / €79.90).
2. Webhook → `POST https://<api>/api/v1/webhook/` with signing secret. Subscribe to:
   `subscription_created`, `subscription_updated`, `subscription_cancelled`, `subscription_expired`, `subscription_resumed`, `subscription_payment_success`, `subscription_payment_failed`.
3. Copy API key, store id, variant ids, and webhook secret into `apps/api/.env` (see `.env.example`).

**Local schema after pulling:**

```bash
pnpm --filter @fiscorai/api db:generate
pnpm --filter @fiscorai/api db:push
```

Cancel is cancel-at-period-end: Lemon cancel API + local `canceled` flag; `subscription_expired` drops the user to Free. Payment methods are managed via the Lemon customer portal (`GET /api/v1/payments/portal`).
