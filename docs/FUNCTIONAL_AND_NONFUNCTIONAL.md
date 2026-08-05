# FiscorAI — Functional & Non-Functional Specification

**Product:** Local-first Amazon EU VAT analyser  
**Repo:** `fiscorai/` (pnpm workspace)  
**Audience:** Product, engineering, QA, go-live planning  
**Scope:** Complete current codebase behaviour (as implemented), not aspirational roadmap  

---

## 1. Product summary

FiscorAI lets Amazon EU sellers:

1. Create an account and pick a plan (Free forever or paid via Lemon Squeezy).
2. Upload an Amazon **VAT Transactions Report** (CSV) for a month or quarter.
3. Process it **locally** into country × tax-scheme breakdowns.
4. View charts (Dashboard), tables & downloads (VAT reports), heuristic checks (Review).
5. Ask an AI Analyst (Gemini) about **all uploaded data**.
6. Manage profile, Amazon token, billing, FAQ, and contact.

Data stays on the machine under default config: **SQLite** for accounts/billing metadata, **filesystem** for CSV/JSON/PDF/XLSX artifacts.

---

## 2. System context

```
┌─────────────┐     JWT/Bearer      ┌──────────────────┐     processVatReport      ┌────────────────────┐
│  Web SPA    │ ◄─────────────────► │  Express API     │ ─────────────────────────► │  @fiscorai/        │
│  Vite/React │   REST + stream     │  Prisma/SQLite   │                            │  tax-processor     │
└─────────────┘                     │  Local storage   │                            └────────────────────┘
                                    └────────┬─────────┘
                         Lemon  ◄────────────┤
                         Gemini ◄────────────┘
```

| Package | Path | Role |
|---------|------|------|
| `@fiscorai/web` | `apps/web` | SPA UI |
| `@fiscorai/api` | `apps/api` | HTTP API, auth, Lemon Squeezy, Gemini, storage orchestration |
| `@fiscorai/tax-processor` | `packages/tax-processor` | CSV → JSON + PDF + XLSX |

**Entry points**

- Web: `apps/web/src/main.tsx` → `App.tsx` → `router.tsx`
- API: `apps/api/src/server.ts` → `app.ts`
- Processor: `packages/tax-processor/src/index.ts` (`processVatReport`)
- E2E: `e2e/critical-journey.spec.ts` + `scripts/e2e-api.mjs`

---

## 3. Functional requirements

### 3.1 Identity & access

| ID | Function | Behaviour |
|----|----------|-----------|
| F-AUTH-01 | Register | `POST /api/v1/users` — email, username, password (≥6). Always creates **Free** plan + subscription row. |
| F-AUTH-02 | Sign in | `POST /api/v1/auth/login` — email/password → access JWT + refresh + subscription snapshot. |
| F-AUTH-03 | Business rejection | Emails starting `biz@` or `businessUser` flag → 403 + business-portal stub URL. |
| F-AUTH-04 | Token refresh | `GET/POST /api/v1/auth/refresh` with refresh token → new pair. |
| F-AUTH-05 | Idle session | Web clears session after **12h** idle (`SESSION_IDLE_MS`). |
| F-AUTH-06 | Axios 401 | Interceptor tries refresh; on failure → `/signin?expired=1`. |
| F-AUTH-07 | Change password | `PUT /api/v1/auth/change-password` with email + new password. Account page uses this. *(API currently has no JWT requirement — security gap.)* |
| F-AUTH-08 | Forgot / reset | API: forgot returns/logs token; reset consumes token. **Web Sign-in “Forgot password?” is non-interactive** — UI stub. |
| F-AUTH-09 | Protected routes | App shell routes require `user.jwtToken` in localStorage. |
| F-AUTH-10 | Logout | Clears tokens/user from storage and navigates away. |

**Web pages:** `/signin`, `/signup` (`SignInPage` / `SignUpPage`).

---

### 3.2 Profile & Amazon token

| ID | Function | Behaviour |
|----|----------|-----------|
| F-USER-01 | View profile | `GET /api/v1/users/profile` |
| F-USER-02 | Update alias/username | `PUT /api/v1/users/:id` — Account page saves alias. *(No ownership check vs JWT subject — gap.)* |
| F-USER-03 | Amazon MWS token | `PUT /api/v1/users/update/amazon/:amazonId` — DB + `amazon-token.txt` on disk. **Not used to sync Seller Central.** |
| F-USER-04 | Account UI | Name, disabled email, Amazon field, password change, toast feedback. “Connected” chip is **always shown** (cosmetic). |

**Route:** `/account`

---

### 3.3 Period selection (shell)

| ID | Function | Behaviour |
|----|----------|-----------|
| F-PER-01 | Period state | Zustand `periodStore`: `fileType` monthly\|quarterly, month, quarter, year. |
| F-PER-02 | PeriodBar | Shown only on **Dashboard, VAT reports, Review** (`SHOW_PERIOD`). **Not on Analyst.** |
| F-PER-03 | Apply | Updates store; pages refetch via React Query keys tied to period payload. |
| F-PER-04 | Default | Typical default month `"3"` / current year pattern in store. |

---

### 3.4 VAT report upload & processing

| ID | Function | Behaviour |
|----|----------|-----------|
| F-DATA-01 | Upload CSV | `POST /api/v1/data/upload-csv` (JWT, multipart). Fields: file + period. Max **100 MB**, `.csv` only. |
| F-DATA-02 | Replace period | Clears existing period folder, then saves new CSV. |
| F-DATA-03 | Process | Calls `processVatReport` with plan code from user plan. Writes JSON, PDF, XLSX next to CSV. |
| F-DATA-04 | Plan write | Writes `subscription.txt` plan code under user storage root. |
| F-DATA-05 | List files | `GET /api/v1/data/user-files` → `{ monthly[], quarterly[] }` xlsx-relative paths. |
| F-DATA-06 | Processed JSON | `POST /api/v1/data/get-processed-json` → countries + categories for selected period. |
| F-DATA-07 | Download | `POST /api/v1/data/download-file` — PDF/XLSX (or other extension) as attachment. |
| F-DATA-08 | Reports UI | Drag-drop / picker, upload, toast, file list, category filters, summary/VAT/transaction views, download buttons. |
| F-DATA-09 | Sample button | “Use sample” creates a fake tiny `sample.csv` (not a real Amazon VAT file) — demo stub. |

**Route:** `/information` (VAT reports)

**Disk layout**

```
storage/{email-with-@-as-hyphen}/
  subscription.txt
  amazon-token.txt          # optional
  monthly/{M}-{YYYY}/
    *.csv
    *.csvprocesado.json
    *.csvprocesado.pdf
    *.csvprocesado.xlsx
  quarterly/{Q#}-{YYYY}/
    …same
```

---

### 3.5 Tax processor (core domain)

| ID | Function | Behaviour |
|----|----------|-----------|
| F-TAX-01 | Parse CSV | Amazon VAT Transactions Report via `csv-parse`. |
| F-TAX-02 | Scheme map | UNION-OSS, VOEC (`*VOEC*`), REGULAR, EMPTY/NO COUNTRY, else raw scheme. |
| F-TAX-03 | Aggregate | Per country × category: ALL totals, TRANSACTION (SALE/REFUND), VAT by rate. RETURN → REFUND. |
| F-TAX-04 | Plan caps | Free 50/50; Basic 1.5k/4.5k; Standard 4.5k/13.5k; Pro unlimited (monthly/quarterly). Excess rows truncated; meta + PDF/XLSX attention banner. |
| F-TAX-05 | JSON out | `{ countries: [{ country, transactionCategories }] }` |
| F-TAX-06 | PDF out | Multi-section summary + VAT appendix + plan notices. |
| F-TAX-07 | XLSX out | SUMMARY, DETAIL_VAT, DETAIL_TRANSACTION, per category-country sheets. |
| F-TAX-08 | CLI | `pnpm --filter @fiscorai/tax-processor process --csv …` |

---

### 3.6 Dashboard

| ID | Function | Behaviour |
|----|----------|-----------|
| F-DASH-01 | Load period data | `useProcessedData` → React Query → get-processed-json. |
| F-DASH-02 | KPIs | Sales, Refunds, Net, VAT (EUR). |
| F-DASH-03 | Charts | Sales vs Refunds pie; sales by tax scheme pie; line by country; bar sales by country (Recharts). |
| F-DASH-04 | Empty | Shared `EmptyPeriod` → CTA to upload. |
| F-DASH-05 | Responsive | `useIsMobile` adjusts chart heights/margins. |

**Route:** `/graphics`

---

### 3.7 Review

| ID | Function | Behaviour |
|----|----------|-----------|
| F-REV-01 | Load data | Same processed JSON for selected period. |
| F-REV-02 | Checks | `buildReviewChecks`: NO COUNTRY, high refund rate (~>7%), free-plan truncation warning, VOEC informational, etc. Severity: critical / warning / info. |
| F-REV-03 | Filings | Heuristic filing deadline hints from period. |
| F-REV-04 | Empty | EmptyPeriod if no data. |

**Route:** `/review`

---

### 3.8 AI Analyst

| ID | Function | Behaviour |
|----|----------|-----------|
| F-AI-01 | Scope | Uses **all uploaded periods** (not PeriodBar). Compact overall + per-period summary for Gemini. |
| F-AI-02 | Premium | Active subscription → unlimited. |
| F-AI-03 | Free quota | **3 questions / UTC day** (`AnalystUsage`). `GET /quota`; exhausted → **402**. |
| F-AI-04 | Ask (non-stream) | `POST /api/v1/analyst/ask` `{ question, language? }` |
| F-AI-05 | Stream | `POST /api/v1/analyst/stream` — AI SDK `streamText` + UI message stream (primary web UX). |
| F-AI-06 | Model | `GEMINI_MODEL` default `gemini-3.5-flash-lite`; key `GEMINI_API_KEY`. Missing key → graceful fallback copy. |
| F-AI-07 | Prompt style | Friendly, short, bold EUR amounts; default overall totals; name period only if user asks; i18n language hint. |
| F-AI-08 | UI | Suggested prompts, markdown answers, quota chip, upgrade CTA, stop/regenerate/copy patterns as implemented. No PeriodBar. |
| F-AI-09 | Gate data | Needs ≥1 processed upload (via user-files). |
| F-AI-10 | Caps | Question ≤2000 chars; summary max ~36 periods; stream message history capped (≈60). |

**Route:** `/analyst`

---

### 3.9 Plans & billing

| ID | Function | Behaviour |
|----|----------|-----------|
| F-BILL-01 | Plan catalogue | Free €0, Basic €14.9, Standard €39.9, Pro €79.9 (`shared/plans.ts` + web `PLANS`). Live prices also set on Lemon Squeezy variants. |
| F-BILL-02 | Current sub | `GET /api/v1/subscriptions/userSubscription` |
| F-BILL-03 | Activate Free | `POST /subscriptions/activate` — Free only. Paid → Lemon Squeezy checkout. |
| F-BILL-04 | Unsubscribe | `DELETE /subscriptions/unSubscribe` → Lemon cancel + local cancel-at-period-end; Free after `subscription_expired`. |
| F-BILL-05 | Checkout | `POST /payments/create-checkout-session` — Lemon hosted checkout for the plan’s monthly subscription variant; `custom.user_id` for webhook mapping. |
| F-BILL-06 | Confirm | Lemon `redirect_url` → `/thankyou`; client polls `confirm-session` + subscription until webhook activates. Cancel → `/payment-failed`. |
| F-BILL-07 | Webhook | `POST /api/v1/webhook/` raw body + `X-Signature` HMAC → subscription lifecycle + payment events sync User/Subscription/Payment. |
| F-BILL-08 | History | `GET /payments` — invoices/payments list in UI. |
| F-BILL-09 | Portal | `GET /payments/portal` — Lemon customer portal URL (cards / invoices). |
| F-BILL-10 | Missing Lemon | Paid checkout returns 503 if API key / store / variant env unset. |
| F-BILL-11 | Thank you | Protected `/thankyou` — confirm + poll until active paid plan; CTAs to billing & dashboard. |
| F-BILL-12 | Payment failed | Protected `/payment-failed` — cancel/abandon messaging; retry via billing; support link. |

**Routes:** `/billing`, `/thankyou`, `/payment-failed`

**Env:** `LEMONSQUEEZY_*` (API key, store id, webhook secret, three variant ids); `PAYMENT_SUCCESS_URL` → `/thankyou`; `PAYMENT_CANCEL_URL` → `/payment-failed`.

---

### 3.10 Help, legal, landing, contact

| ID | Function | Behaviour |
|----|----------|-----------|
| F-HELP-01 | FAQ | Accordion FAQ (i18n) at `/faq` — **public** for guests; signed-in users keep AppShell. |
| F-HELP-02 | Contact | Form → `POST /api/v1/contact` persists to SQLite. **No email send.** Auth required (`/support`). |
| F-HELP-03 | Privacy / Terms | Expanded bullet pages `/privacy`, `/terms` (public minimal chrome). Soft-launch copy; counsel disclaimer. |
| F-HELP-04 | Refund | Public `/refund` — monthly Lemon subscription; cancel at period end → Free; dispute/support process. |
| F-HELP-05 | Cookies | Public `/cookies` — essential auth/lang/session storage; no marketing cookies / consent banner yet. |
| F-HELP-06 | Signup legal | `/signup` requires acceptance of Terms + Privacy before register. |
| F-LAND-01 | Landing | Marketing home `/` — demo charts, pricing, CTAs. **English-only** (not in i18n). Footer links: FAQ, Privacy, Terms, Refunds, Cookies. |
| F-SHELL-01 | Nav | Desktop sidebar; mobile tabs (Dash/VAT/Review/Analyst) + More sheet (Account, Billing, Help, Support, Privacy, Terms, Refunds, Cookies). |
| F-SHELL-02 | Language | EN/DE/ES/FR/IT via LanguagePicker ↔ `uiStore` ↔ i18next + localStorage. |
| F-SHELL-03 | Plan box | Shows current plan + limit blurb in shell. |

---

### 3.11 Cross-cutting functional behaviour

| ID | Function | Behaviour |
|----|----------|-----------|
| F-X-01 | API envelope | Most endpoints: `{ message, statusCode, data? }`. Exception: `user-files` returns raw object. |
| F-X-02 | Validation | Zod schemas on bodies (`validateBody`). |
| F-X-03 | Errors | `AppError` → consistent fail JSON. |
| F-X-04 | Toast | Zustand toast store + shared `Toast` component. |
| F-X-05 | Empty states | Shared `EmptyPeriod` for no-data views. |
| F-X-06 | i18n namespaces | common, shell, empty, auth, reports, billing, account, help, review, analyst, dashboard. |
| F-X-07 | Health | `GET /health` → `{ ok: true }`. |
| F-X-08 | CORS | Allowlist from `CORS_ORIGIN`, credentials true. |

---

## 4. End-to-end user journeys

### 4.1 Critical happy path

1. Open landing → Sign up (Free) or Sign in (e.g. demo).
2. Open VAT reports → select period → upload Amazon CSV.
3. Processor runs → artifacts on disk.
4. Dashboard / Review show charts & checks for that period.
5. (Optional) Billing → Lemon checkout → `/thankyou` (webhook + poll) → premium.
6. Analyst answers questions over **all** uploads (stream + quota rules).
7. Download PDF/XLSX for accountant.

### 4.2 Paid upgrade path

Choose paid plan → Lemon checkout redirect → pay → `/thankyou` (confirm + poll) and/or webhook → subscription active until `renews_at` / cancel → Analyst unlimited + higher tax caps on next upload. Cancel/abandon → `/payment-failed`.

### 4.3 Multi-period path

Upload several months/quarters → Dashboard/Review still period-scoped via PeriodBar → Analyst aggregates everything.

---

## 5. Non-functional requirements

### 5.1 Architecture & maintainability

| ID | Requirement | Implementation |
|----|-------------|----------------|
| NF-ARCH-01 | Layered API | dto → routes → controller → service → repository |
| NF-ARCH-02 | Thin web pages | Feature hooks + `lib/` pure utils + `api/*.api.ts` |
| NF-ARCH-03 | Server state | TanStack React Query |
| NF-ARCH-04 | Client state | Zustand (period, toast, language) |
| NF-ARCH-05 | Typed contracts | Shared TS types in web `types/api.ts`; Zod on API |
| NF-ARCH-06 | Monorepo | pnpm workspaces; tax-processor as workspace dep |

### 5.2 Performance

| ID | Requirement | Notes |
|----|-------------|-------|
| NF-PERF-01 | Upload size | Hard cap 100 MB CSV |
| NF-PERF-02 | Processing | Sync in request path; large CSVs block that request |
| NF-PERF-03 | JSON body | Express JSON limit 2 MB |
| NF-PERF-04 | Analyst prompt | Compact summary (not raw CSV); max ~36 periods |
| NF-PERF-05 | Charts | Client-side Recharts aggregation via `tax-agg` |
| NF-PERF-06 | i18n | Locales bundled statically (no lazy locale chunks) |

### 5.3 Scalability & deployment

| ID | Requirement | Notes |
|----|-------------|-------|
| NF-SCALE-01 | Single-node local-first | SQLite + local disk; not multi-instance safe |
| NF-SCALE-02 | No object storage | No S3 abstraction in default path |
| NF-SCALE-03 | No containers in-repo | No Docker/K8s manifests |
| NF-SCALE-04 | Dev ports | Web `:5173`, API `:9292` |
| NF-SCALE-05 | Config | `apps/api/.env`; web `VITE_API_URL` optional |

### 5.4 Reliability & availability

| ID | Requirement | Notes |
|----|-------------|-------|
| NF-REL-01 | Lemon missing | Degraded 503 on paid checkout |
| NF-REL-02 | Gemini missing/quota | Analyst fallback text; no crash |
| NF-REL-03 | Lemon customer | Created on first checkout via Lemon, not at signup |
| NF-REL-04 | Corrupt period skip | Analyst all-data loader skips bad periods |

### 5.5 Security & privacy

| ID | Requirement | Status |
|----|-------------|--------|
| NF-SEC-01 | Password hashing | bcrypt cost 10 |
| NF-SEC-02 | JWT access + refresh | Separate secrets; Bearer header |
| NF-SEC-03 | CORS allowlist | Configurable |
| NF-SEC-04 | Lemon webhook verify | When `LEMONSQUEEZY_WEBHOOK_SECRET` set (`X-Signature` HMAC) |
| NF-SEC-05 | Secrets not in client | Gemini / Lemon API key server-only |
| NF-SEC-06 | Upload type check | `.csv` extension enforced |
| NF-SEC-07 | Change-password auth | **Gap:** unauthenticated endpoint |
| NF-SEC-08 | User update ownership | **Gap:** `:id` not verified against JWT |
| NF-SEC-09 | Reset token exposure | **Gap:** returned/logged; no email channel |
| NF-SEC-10 | Amazon token at rest | Plaintext file + DB field |
| NF-SEC-11 | Rate limiting | Only Analyst free daily meter; no global API rate limit |
| NF-SEC-12 | Contact PII | Stored in SQLite indefinitely |

### 5.6 Usability & localisation

| ID | Requirement | Notes |
|----|-------------|-------|
| NF-UX-01 | Languages | EN, DE, ES, FR, IT for app chrome |
| NF-UX-02 | Landing | EN only |
| NF-UX-03 | Mobile shell | Bottom tabs + More sheet |
| NF-UX-04 | Empty states | Consistent upload CTAs |
| NF-UX-05 | Legal | Soft-launch Privacy/Terms/Refund/Cookies — not counsel-reviewed |

### 5.7 Observability

| ID | Requirement | Notes |
|----|-------------|-------|
| NF-OBS-01 | Health check | `/health` |
| NF-OBS-02 | Analyst errors | Console log reason only (no API key) |
| NF-OBS-03 | Structured APM | Not present |

### 5.8 Testing & quality gates

| ID | Requirement | Location |
|----|-------------|----------|
| NF-TEST-01 | Tax unit tests | `packages/tax-processor` Vitest |
| NF-TEST-02 | API integration | Temp SQLite/storage, health/auth/upload |
| NF-TEST-03 | Analyst summary unit | `analyst.summary.test.ts` |
| NF-TEST-04 | Web unit | AuthPages + tax-agg |
| NF-TEST-05 | E2E critical journey | Playwright Chromium |
| NF-TEST-06 | CI | `.github/workflows/ci.yml` — install, generate, build, unit, e2e |

### 5.9 Compliance / domain constraints

| ID | Requirement | Notes |
|----|-------------|-------|
| NF-DOM-01 | Not filing software | Copy/disclaimers: verify with accountant |
| NF-DOM-02 | EUR display | UI formats EUR |
| NF-DOM-03 | Amazon report source | Seller Central → FBA → VAT Transactions Report |
| NF-DOM-04 | Subscription model | **Lemon native monthly subscriptions**; local `expiresAt` mirrors `renews_at` / `ends_at` via webhooks |

---

## 6. Data model (Prisma / SQLite)

| Model | Purpose |
|-------|---------|
| User | Credentials, profile, plan, lemonCustomerId, amazonId |
| Subscription | plan, price, active, canceled, lemonSubscriptionId, lemonPortalUrl, expiresAt (1:1 user) |
| Payment | Lemon order/invoice history |
| PasswordResetToken | Reset flow |
| Contact | Support form messages |
| AnalystUsage | Free-tier daily question counts |

---

## 7. External integrations

| System | Use | Required for core VAT? |
|--------|-----|------------------------|
| Lemon Squeezy | Checkout, webhooks, portal, invoices (MoR) | No (Free path works) |
| Google Gemini | Analyst Q&A | No (fallback if unset) |
| SendGrid / SMTP | — | **Not integrated** (contact/reset stub) |
| Amazon MWS/SP-API | — | Token stored only |

**Env (API):** `PORT`, `DATABASE_URL`, `JWT_*`, `STORAGE_ROOT`, `CORS_ORIGIN`, `LEMONSQUEEZY_*`, `PAYMENT_*_URL`, `GEMINI_API_KEY`, `GEMINI_MODEL`.

---

## 8. Plan limits matrix

| Plan | Price | Monthly tx | Quarterly tx | Analyst |
|------|-------|------------|--------------|---------|
| Free | €0 | 50 | 50 | 3 questions / day |
| Basic | €14.99 | 1 500 | 4 500 | Unlimited while active |
| Standard | €39.99 | 4 500 | 13 500 | Unlimited while active |
| Pro | €79.99 | Unlimited | Unlimited | Unlimited while active |

Paid “active” while Lemon subscription status is active (local `expiresAt` follows `renews_at` / `ends_at` from webhooks).

---

## 9. Stubbed / incomplete functions (explicit)

| Area | What’s missing |
|------|----------------|
| Password reset UX | No working forgot-password UI; no email delivery |
| Contact | Persist only; no outbound mail |
| Amazon sync | Token unused for auto-import |
| Register plan choice | Ignored; always Free |
| Business portal | Hardcoded redirect stub |
| Sample CSV | Not a real VAT report |
| Landing i18n | English only |
| Full legal | Soft-launch bullets (not counsel-reviewed); company registry / Impressum details incomplete |
| Cookie consent banner | Not shown (no marketing/analytics cookies yet) |
| Influencer login flag | Accepted in DTO, unused |
| Horizontal scale | Local SQLite/FS only |
| Historical Stripe customers | Not migrated; re-checkout on Lemon |

---

## 10. Traceability — UI route → API

| UI route | Primary APIs |
|----------|--------------|
| `/` | — |
| `/signin` | `POST /auth/login` |
| `/signup` | `POST /users` |
| `/graphics` | `POST /data/get-processed-json` |
| `/information` | upload-csv, user-files, get-processed-json, download-file |
| `/review` | get-processed-json |
| `/analyst` | `/analyst/quota`, `/analyst/stream` (and `/ask`) |
| `/account` | profile, users/:id, update/amazon, change-password |
| `/billing` | userSubscription, create-checkout-session, payments, cards |
| `/thankyou` | `POST /payments/confirm-session` |
| `/payment-failed` | — |
| `/faq` | — |
| `/support` | `POST /contact` |
| `/privacy`, `/terms`, `/refund`, `/cookies` | — |

---

## 11. Production go-live checklist (payments & legal)

| Item | Notes |
|------|--------|
| Lemon live keys | `LEMONSQUEEZY_API_KEY`, store id, three variant ids on API |
| Webhook endpoint | `POST /api/v1/webhook/` with `LEMONSQUEEZY_WEBHOOK_SECRET`; subscription + payment events |
| Return URLs | `PAYMENT_SUCCESS_URL` = `https://<prod>/thankyou`; `PAYMENT_CANCEL_URL` = `https://<prod>/payment-failed` |
| CORS / web API | `CORS_ORIGIN` matches prod web origin; web `VITE_API_URL` points at prod API |
| Legal review | Replace soft-launch Privacy/Terms/Refund/Cookies with counsel-approved copy and real company entity |
| Email | Contact + password reset still need outbound mail for full production |

---

## 12. Document control

| Field | Value |
|-------|-------|
| Derived from | Live monorepo inventory (web, api, tax-processor, e2e, CI) |
| Intent | Functional + non-functional baseline for QA, onboarding, go-live |
| Update when | Routes, env, Lemon/Gemini behaviour, or plan limits change |

---

*This document describes implemented behaviour. Gaps listed in §9 and security rows marked “Gap” are intentional callouts, not accidental omissions.*
