# FiscorAI — Build Plan: From EU VAT Analyser to US + UK + EU "No Accountant Needed" Compliance Tool

*Internal engineering roadmap. Grounded in the current codebase (`fiscorai/`, pnpm monorepo: `apps/web`, `apps/api`, `packages/tax-processor`) as of August 2026.*

## Where we actually are today

Worth stating plainly before planning the leap, because it's a big one: FiscorAI today is a **local-first EU VAT analyser**, not a compliance tool. A user uploads an Amazon VAT Transactions Report CSV, `packages/tax-processor` parses it into country × category totals (`UNION-OSS` / `VOEC` / `REGULAR` scheme mapping), and the web app shows dashboards, heuristic review flags, and an AI Analyst (Gemini) that can talk about the data. Nothing files anything. Nothing calculates US sales tax. Nothing touches the UK specifically (UK sales currently just fall into whatever scheme the EU report assigns them). Storage is SQLite + local filesystem, single-node, not built for multi-tenant scale. The spec doc (`docs/FUNCTIONAL_AND_NONFUNCTIONAL.md`) is explicit that this is "not filing software" — that line has to flip for the product this plan describes.

Getting to "an Amazon seller doesn't need an accountant across US, UK, and EU" requires four things this build doesn't have yet: (1) US sales tax logic, (2) UK VAT as a first-class module rather than an EU side effect, (3) actual filing/remittance, not just analysis, and (4) infrastructure that can hold real customer financial data at scale, securely. Below is a phased path there, sequenced so each phase ships something sellable on its own rather than betting everything on one big-bang release.

## Sequencing philosophy: buy the filing rails, build the intelligence layer

The single most important strategic call in this plan: **do not try to become a direct e-filer for 46 US states, HMRC, and every EU VAT authority from scratch.** That's a multi-year, heavily-regulated undertaking (see competitor research — Avalara took over a decade and is still enterprise-only; Numeral raised $57M just for US filing). The faster, more defensible path is to build FiscorAI as the **AI-driven orchestration and nexus-intelligence layer**, and integrate an existing filing-as-a-service API (Numeral or Kintsugi for US; a UK/EU VAT compliance API partner such as Taxdoo or Marosa, or a filing-focused partner if one exposes a clean API) underneath it for the actual e-file/remittance step. FiscorAI's differentiation isn't "we built our own filing pipes" — it's "we're the only product that watches a seller's Amazon data continuously, tells them exactly where they owe something in plain language, and pushes the button for them across all three regions in one place," which today requires stitching together 2-3 vendors (confirmed gap from competitive research). Build vs. buy on filing infrastructure is the highest-leverage decision here; revisit it only once volume justifies the multi-year investment of going direct.

## Phase 0 (weeks 0–4): Foundation hardening — make what exists production-safe

Nothing else matters if the current security gaps stay open once we're asking sellers to trust us with tax/financial data. The spec doc already lists these (§5.5, §9) — this phase is just fixing them before scope grows:

- Fix `PUT /api/v1/auth/change-password` — currently unauthenticated (F-AUTH-07 gap). Require JWT.
- Fix `PUT /api/v1/users/:id` — no ownership check against JWT subject (F-USER-02 gap). Add authorization middleware.
- Encrypt the Amazon token at rest (currently plaintext file + DB field, NF-SEC-10). Move to envelope encryption (KMS-backed) at minimum.
- Add real outbound email (password reset, contact form) — currently both are stubs (NF-SEC-09, §9). This blocks any real customer support motion.
- Add global API rate limiting (currently only the Analyst free-tier meter, NF-SEC-11).
- Decide and document the data-residency story now, before EU/UK financial data volume grows — this affects the Phase 1 infra decision below.

**Also in this phase:** migrate Stripe from one-time 30-day Checkout sessions (NF-DOM-04) to real Stripe Subscriptions. A recurring compliance service needs recurring billing; the current model is a workaround that won't survive contact with a filing product where sellers expect auto-renewal and proration.

## Phase 1 (months 1–3): Infrastructure to hold real multi-tenant financial data

- **Postgres over SQLite.** SQLite + local filesystem (NF-SCALE-01/02) was fine for a single-user local tool; it is not fine for a hosted SaaS product handling other people's tax data. Migrate the Prisma schema to Postgres (Prisma makes the provider swap mechanically easy; the work is in connection pooling, migrations, and moving `storage/{email}/...` file artifacts to object storage — S3 or equivalent — instead of local disk).
- **SP-API integration, replacing manual CSV upload as the primary path.** The `amazonId`/`amazon-token.txt` field already exists but is unused (F-USER-03: "Not used to sync Seller Central"). This is the single highest-leverage engineering investment in the whole plan: manual CSV upload is why every "no accountant needed" claim rings hollow today — a tool that needs a human to remember to export and upload a report monthly isn't actually automating anything. Build the SP-API OAuth flow and scheduled report pulls (VAT Transactions Report for EU/UK, and the relevant US settlement/tax reports) so data flows in without user action.
- **Multi-tenant data model for jurisdictions.** Extend Prisma with `NexusStatus` (per user, per jurisdiction: state/country, status enum [monitoring/threshold-approaching/register-now/registered], basis [economic/physical/inventory]), `Registration` (jurisdiction, registration number, effective date, filing frequency), and `FilingRecord` (jurisdiction, period, status, amount, filed-via-partner reference). This is the schema backbone everything downstream hangs off.

## Phase 2 (months 2–4, parallel to Phase 1): UK VAT as a first-class module

This is the shortest path to "three regions" because it reuses the existing EU VAT parsing logic almost directly — UK VAT and EU VAT share enough structure (VAT rates, return periodicity, OSS-adjacent concepts) that this is an extension of `packages/tax-processor`, not a rewrite.

- Add a UK-specific scheme classifier alongside the existing `UNION-OSS` / `VOEC` / `REGULAR` mapping in `aggregate.ts` — UK sales currently get swept into the generic EU logic; they need their own bucket reflecting UK-specific VAT treatment (20%/5%/0% rates, not EU member-state rates).
- Build the **non-established-seller threshold logic**: UK-established sellers get the £90,000 rolling-12-month threshold; non-UK-established sellers (the majority of Amazon sellers this product targets) get no threshold at all and must register from first sale. This distinction is the single most common mistake sellers make and is exactly the kind of thing the AI Analyst should catch automatically rather than the seller having to know to ask. (This logic — and the underlying threshold research — already exists in the `amazon-seller-tax` Claude skill built alongside this plan; port that reasoning into the product's rules engine rather than re-deriving it.)
- Extend the nexus/registration status model (from Phase 1) to surface UK VAT registration status in the Review page (`/review`) as a first-class check, not a generic heuristic.
- MTD (Making Tax Digital) compatible record-keeping: UK VAT-registered businesses must keep digital records and file via MTD-compatible software. Output format needs to satisfy this even before Phase 4's actual HMRC filing integration exists — it's a prerequisite either way.

## Phase 3 (months 4–7): US sales tax module

The heaviest lift of the three regions because the US has 46 states with independent rules, not one authority.

- **Nexus engine**: per-state economic nexus thresholds (mostly $100k revenue, CA/TX at $500k, NY at $500k+100 transactions — pull from a maintained reference table, not hardcoded, since these change) plus **physical/inventory nexus** from FBA warehouse placement. This requires ingesting Amazon's Inventory Event Detail / inventory placement reports via SP-API (Phase 1 dependency) — physical nexus can't be determined from sales data alone, which is a gap every bookkeeping-sync competitor (A2X, Link My Books) has, since they only see settlement data, not inventory location. **This is a genuine, defensible product differentiator if built well** — surface it prominently.
- **Marketplace-facilitator-aware reasoning**: the AI Analyst must distinguish "Amazon collects/remits this sale's tax" from "you still owe a registration/filing obligation in this state" — conflating the two is the top user-facing mistake to avoid (validated against real test runs of the `amazon-seller-tax` skill during development).
- **Income/franchise tax flag** (not full income tax filing, but a flag): California's 25%-of-sales / ~$750k "doing business" trigger and similar state rules are a separate axis from sales tax nexus and are easy to miss entirely — even a simple flag ("you likely have CA franchise tax exposure, consult a preparer for the income tax return itself") adds real value without requiring FiscorAI to become an income-tax-filing product too.
- **Categorization/bookkeeping parity with A2X and Link My Books** first, since that's the lower-risk, faster-to-ship piece and the direct competitive comparison point — sellers already expect Xero/QuickBooks sync as table stakes.

## Phase 4 (months 6–10): Actual filing and remittance — the "no accountant" claim becomes true

Everything before this phase is analysis and monitoring, which is what the product already does today for EU. This phase is where the product crosses from "tells you what you owe" to "makes it not your problem."

- **US**: integrate a filing-as-a-service partner API (Numeral or Kintsugi — both expose registration + filing/remittance as an API surface, priced roughly per-state-per-filing based on competitive research). FiscorAI's job is nexus detection, seller-facing UX, and orchestration; the partner's job is the actual state DOR submission. Build the `FilingRecord` sync layer from Phase 1's schema against whichever partner API is chosen.
- **UK**: HMRC's MTD API for VAT return submission is a direct government API (not a third-party filing partner) — this is more tractable to build in-house than the US 46-state problem, since it's one authority with one well-documented API.
- **EU**: OSS filing is centralized (one return via the seller's member state of identification) which is comparatively tractable; local registrations from Pan-EU inventory storage (Germany, Poland, etc.) are the harder part and likely still want a compliance-service partner (Taxdoo/hellotax/Marosa-style) for the actual local filings, at least initially, since several EU countries require a fiscal representative for non-EU sellers — a legal relationship, not just an API integration.
- Every filing action needs an explicit **human-in-the-loop review-and-approve step** before submission, at least initially — both for trust-building with early customers and because "silently filed something wrong on your behalf" is the worst-case failure mode for this product category. The AI Analyst is well-positioned to draft the filing and explain it in plain language; the seller (or, for the top pricing tier, a FiscorAI-side reviewer) approves before it goes out.

## Phase 5 (months 9–14): Close the loop — reduce human touch toward zero for the common case

- Once filing infrastructure (Phase 4) is proven reliable across a few hundred filings, move toward auto-approve for low-risk, high-confidence filings (e.g., a return that exactly matches the prior period's pattern) while keeping human review for anomalies — this is where "no accountant needed" actually becomes true for the median seller rather than just "an accountant reviews an AI draft instead of building it from scratch."
- Proactive alerting: today the Review page is pull-based (seller has to visit it). Move to push (email/in-app) the moment a nexus threshold is crossed or a filing deadline approaches — this is a meaningfully different, more valuable product than a dashboard the seller has to remember to check.
- Expand marketplace coverage beyond Amazon (Shopify, Walmart, eBay, TikTok Shop) — the same nexus/filing engine applies once ingestion exists for another channel's settlement/transaction data; this is a data-ingestion problem, not a re-architecture.

## Phase 6 (ongoing): Trust and scale infrastructure

- SOC 2 Type II — not optional for a product that touches customer financial/tax data and will increasingly be evaluated by sellers' own accountants and by any enterprise-tier customer. Start the control implementation in parallel with Phase 1/2, since SOC 2 readiness takes months and it's far cheaper to build controls in from the start than retrofit them.
- Multi-region deployment / data residency as EU customer volume grows (GDPR considerations for where financial data physically lives).
- Expand i18n beyond the current EN/DE/ES/FR/IT app chrome to cover the UK/US launch markets properly, and bring the landing page (`/`, currently English-only per F-LAND-01) into the same i18n system.

## Sequencing summary

| Phase | Timeframe | Ships |
|---|---|---|
| 0 | Weeks 0–4 | Security fixes, real subscriptions — safe to grow on |
| 1 | Months 1–3 | Postgres/object storage, SP-API auto-ingestion, jurisdiction data model |
| 2 | Months 2–4 (parallel) | UK VAT as first-class module, non-established-seller logic |
| 3 | Months 4–7 | US nexus engine (economic + inventory), categorization parity |
| 4 | Months 6–10 | Real filing/remittance, US via partner API, UK via HMRC MTD, EU via OSS + partner for local regs |
| 5 | Months 9–14 | Auto-approve for low-risk filings, proactive alerts, multi-marketplace |
| 6 | Ongoing from month 1 | SOC 2, data residency, i18n expansion |

Phases 1 and 2 run in parallel (different parts of the stack, minimal overlap). Phase 3 can start once Phase 1's SP-API ingestion exists, since US nexus needs inventory-location data the same way EU does. Phase 4 is the phase that actually makes the "no accountant needed" claim true — everything before it is a (valuable, sellable) monitoring and categorization product, which is worth being honest about in how the product is marketed at each stage.

## Open technical decisions to make early

- **Filing partner selection (US)**: Numeral vs. Kintsugi — both are viable per competitive research; the decision should turn on API quality/docs, pricing at expected volume, and willingness to do a co-marketing/OEM-style arrangement rather than treating FiscorAI as just another reseller.
- **EU local-registration partner**: whether to partner with one of Taxdoo/hellotax/SimplyVAT/Marosa or build fiscal-representative relationships directly in the highest-volume Pan-EU countries (Germany, Poland) once volume justifies it.
- **How much of the AI Analyst's filing-drafting work is Gemini vs. deterministic rules code**: nexus threshold math and categorization should stay deterministic (auditable, testable) even as the Analyst's natural-language explanation layer stays LLM-driven — don't let the LLM compute the actual numbers that go on a filing.
