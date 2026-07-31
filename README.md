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
