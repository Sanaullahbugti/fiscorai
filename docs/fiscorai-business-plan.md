# FiscorAI — Business Plan

*Internal strategy document. Financial figures are bottom-up estimates for planning purposes, not audited projections — treat every number here as a working assumption to stress-test, not a commitment.*

## 1. Executive summary

FiscorAI is repositioning from a local-first EU VAT analyser into the first single product that takes an Amazon seller from "I have no idea what I owe" to "it's filed" across US sales tax, UK VAT, and EU VAT. The competitive research behind this plan confirms a real, currently-open gap: no existing product does calculation + registration + actual filing across all three regions for physical-goods sellers in one place. Sellers today stitch together 2–3 vendors (a bookkeeping-sync tool like A2X or Link My Books, a US filing tool like Numeral or Kintsugi, and a EU VAT compliance service like hellotax or Taxdoo) — or pay an accountant $1,500+/month to do it manually. FiscorAI's bet is that AI-driven nexus monitoring plus a "buy the filing rails, build the intelligence layer" architecture (detailed in the companion build plan) can collapse that into one product, priced well under the accountant alternative, without the multi-year build required to become a direct e-filer everywhere.

## 2. Market opportunity

Figures below are pulled from current public sources where available; ranges reflect genuinely inconsistent methodologies across sources (different definitions of "active seller"), and are flagged accordingly.

- **Active Amazon third-party sellers globally**: estimates range roughly **1.6M–2.5M** depending on source and "active" definition (SmartScout/Red Stag ~1.9M active of ~9.7M total registered accounts; Marketplace Pulse ~1.65M by end of 2025, down from 2.4M in 2021).
- **Geographic split** (Statista, Q1 2025, directional not precise): US ~1.9M, UK ~281k, Germany ~244k, Italy ~217k, France ~212k. Note the US figure alone approaches the global "active" estimate from other sources — a sign these datasets aren't using consistent definitions; use for rough proportions, not precise totals.
- **True multi-jurisdiction exposure is a minority segment, but it's the highest-intent one**: Marketplace Pulse data shows 69% of sellers sell in only one marketplace, and under 1% sell in 11+ countries. This means FiscorAI's realistic serviceable segment — sellers who actually need multi-region tax handling — is a low-single-digit percentage of the total seller base, not the whole market. That's a feature for go-to-market focus, not a flaw: this segment has the highest willingness to pay (they're the ones currently paying $1,500+/month to accountants or juggling multiple vendors) even though it's small in absolute seller count.
- **Category market size**: multiple overlapping estimates put "sales tax / VAT compliance software" at roughly **$1.6B–$5B (2024/2025)** growing at **12–18% CAGR** toward **$3.7B–$12B by the early 2030s**, within a broader "tax compliance software" category estimated at $22–25B growing toward $56–76B. These are commercial market-research estimates, useful as a directional signal of a growing, well-capitalized category rather than a precise TAM for FiscorAI specifically.
- **What sellers pay today** (real quoted prices, useful as pricing anchors): hellotax €39–€399/mo depending on country count; AVASK EU VAT compliance from ~€117/mo per country; TaxJar filing at $50–55/return plus $299 per new-state registration; full-service accountants at $1,500+/month for comprehensive multi-state coverage. FiscorAI's pricing (Section 5) is anchored against this range.

**Bottom-up TAM/SAM/SOM framing:**

| Layer | Definition | Rough size |
|---|---|---|
| TAM | All Amazon 3P sellers globally | ~1.6M–2.5M |
| SAM | Sellers with genuine multi-jurisdiction exposure (Pan-EU FBA users, US sellers with 3+ state nexus, or any seller active in 2+ of US/UK/EU) | Low single-digit % of TAM → roughly **50,000–150,000** (derived estimate, not sourced — treat as a planning assumption) |
| SOM (Year 1–2 target) | Sellers FiscorAI can realistically reach and convert during initial go-to-market | Low hundreds to low thousands of paying accounts (see Section 6) |

## 3. Competitive landscape

| Competitor | What they do | Regions | Pricing (public) | Gap FiscorAI exploits |
|---|---|---|---|---|
| **Avalara** | Full nexus/calc/filing, enterprise-grade, 190+ countries | US + UK + EU | Custom/quote-based | Enterprise-priced and complex; not a self-serve SMB product. Private under Vista Equity, prepping 2026 IPO after a $500M BlackRock-led raise (Nov 2025) — well-capitalized but not built for the Amazon-seller SMB segment. |
| **TaxJar (Stripe)** | US sales tax calc, reporting, AutoFile | **US only** for filing (Stripe now routes international VAT to Stripe Tax) | Starter $39/mo, AutoFile $50–55/filing, Tax Complete from $90/mo | No real international VAT filing despite Amazon data access — a seller with EU/UK exposure needs a second vendor. |
| **A2X** | Settlement-report → accounting software sync (bookkeeping only) | Channel-agnostic, no tax filing | From $29/mo/channel | No filing/remittance at all — pure categorization, same category as FiscorAI's *current* product, not where FiscorAI is headed. |
| **Taxdoo / hellotax / SimplyVAT / Marosa** | EU VAT registration + OSS/IOSS filing, services-plus-software hybrids | **EU (some UK)** | Quote-based; hellotax €39–€399/mo | EU/UK only, no US; market shows visible churn between these vendors on service-quality complaints — an opening for a more self-serve, AI-transparent alternative. |
| **Numeral** | US nexus detection, registration, filing/remittance | **US only** | $150/state registration, $75/state/filing | US-only; well-funded ($57M total, $35M Sept 2025 round, 3.5x YoY growth) — a credible filing-partner candidate for FiscorAI's US layer (see build plan) as much as a competitor. |
| **Kintsugi** | AI-driven US nexus + filing; some international VAT monitoring claimed | Primarily US, claims 106+ country VAT/GST *monitoring* (not filing) | $75/state filing, no onboarding fee | Same US-only filing reality; October 2025 "Kintsugi powered by Vertex" partnership signals consolidation pressure in the category. Also a candidate filing partner. |
| **Zamp** | US sales tax "concierge" — human team + software, flat pricing by nexus-state count | US only | Quote-based | Positions against DIY tools for sellers who want done-for-you; validates demand for FiscorAI's white-glove tier, but still US-only. |
| **Link My Books** | Settlement categorization → Xero/QuickBooks, multi-channel (Amazon, Shopify, TikTok Shop, etc.) | Channel-agnostic, no filing | $21–$100/mo by order volume | Direct competitor to FiscorAI's *current* categorization feature; no filing, no nexus intelligence. |
| **Amazon VAT Services** | Amazon's own VAT registration/filing | Discontinued Oct 31, 2024 | — | Amazon explicitly exited this business and now points sellers to third parties (Avalara, Taxamo, Sovos) — widens the market gap rather than closing it. |
| **Quaderno** | VAT/GST/sales-tax monitoring + compliant invoicing for digital sellers | US (nexus) + EU + AU/NZ/Canada, calculation/invoicing not full filing | $29–$149/mo | Built for digital/SaaS products, not physical-goods FBA logistics; no filing. |

**Positioning statement**: *FiscorAI is the only product built specifically for physical-goods Amazon sellers that watches their actual marketplace and inventory data continuously, tells them in plain language exactly where they owe something across the US, UK, and EU, and files it — instead of making them run three separate vendors or write a check to an accountant every month.*

## 4. Value proposition by segment

- **Pan-EU FBA sellers** (acute pain today): inventory storage triggers VAT registration obligations in multiple countries regardless of sales volume — a trap most sellers don't discover until it's expensive. FiscorAI's inventory-aware nexus engine (build plan Phase 3) catches this automatically; competitors relying only on settlement/sales data structurally cannot.
- **US multi-state sellers**: economic + physical (FBA inventory) nexus tracking most competitors don't combine; marketplace-facilitator-aware reasoning that avoids the single most common costly mistake (assuming "Amazon collects tax" means "I have no obligations").
- **Sellers currently paying an accountant $1,500+/month**: FiscorAI's mid/upper tiers (Section 5) target a fraction of that cost for the recurring compliance workflow, while keeping a human-in-the-loop review step so trust is earned incrementally rather than assumed.

## 5. Revenue model

Evolve FiscorAI's existing four-tier structure (Free €0 / Basic €14.9 / Standard €39.9 / Pro €79.9 — currently gating transaction volume and Analyst usage, and repriced below the incumbent EU VAT tool these tiers were originally cloned from) toward tiers that reflect the new filing capability, anchored against the competitive pricing data in Section 2:

| Tier | Target user | What's included | Illustrative price |
|---|---|---|---|
| **Monitor** (Free) | Trial / single-region sellers | Categorization, dashboards, nexus *monitoring* (no filing), 3 AI Analyst questions/day — roughly today's product, extended to 3 regions | €0 |
| **Guardian** | Growing sellers, 1–5 jurisdictions | Everything in Monitor + actual filing/remittance for up to 5 jurisdictions, unlimited Analyst | ~€79–99/mo base + per-jurisdiction filing fee (anchor near competitor $75/state/filing, undercut modestly) |
| **Pro** | Established multi-region sellers, 6+ jurisdictions | Unlimited jurisdictions, priority filing review turnaround, proactive threshold alerts | ~€249–349/mo flat |
| **Concierge** (new, matches Zamp-style demand validated in competitive research) | Sellers who want a human backstop | Everything in Pro + human review of every filing before submission, dedicated support | Custom, quote-based — highest margin tier |

This is a **recurring subscription model**, which requires the Phase 0 build-plan item (migrating off one-time 30-day Stripe Checkout to real Stripe Subscriptions) — the current billing architecture cannot actually support this revenue model as-is.

## 6. Rough financial projections (illustrative, bottom-up)

Assumes paid filing capability (build plan Phase 4) is live and the product is in active go-to-market roughly 12 months from today, given the phased build timeline. These are planning assumptions to stress-test against actuals, not forecasts to hold the team to.

| Milestone | Paying accounts | Blended ARPU/mo | MRR | ARR |
|---|---|---|---|---|
| 6 months post-filing-launch | 150 | €69 | ~€10,350 | ~€124k |
| 12 months post-filing-launch | 600 | €85 | ~€51,000 | ~€612k |
| 24 months post-filing-launch | 1,800 | €105 (mix shifts toward Pro/Concierge) | ~€189,000 | ~€2.27M |

Sensitivity worth flagging explicitly: the SAM estimate (50k–150k sellers) is a derived assumption, not a sourced figure — if the real addressable segment is closer to the low end, these targets require a higher market-share capture rate than currently modeled, which should be revisited once early conversion data exists (first 100 paying customers will be the most informative data point in this entire plan).

## 7. Risks and mitigations

| Risk | Why it matters | Mitigation |
|---|---|---|
| **Regulatory/liability exposure** | A wrong filing is a real financial and legal problem for the customer, not just a bug | Human-in-the-loop review before every submission until volume and track record justify auto-approve (build plan Phase 5); keep filing execution on partner APIs with their own compliance guarantees rather than building unproven in-house e-file logic first |
| **Well-funded, focused competitors** | Numeral ($57M raised, 3.5x YoY growth), Kintsugi (Vertex-backed), Avalara (IPO-track, $500M raise) are all better capitalized in their single-region niches | Compete on breadth (single product, three regions) and on the Amazon-seller-specific inventory-nexus intelligence competitors structurally lack, not on out-spending them in any one region |
| **Narrow beachhead market** | True multi-jurisdiction sellers are a minority of all Amazon sellers | Go-to-market (see marketing plan) targets this segment precisely rather than diluting spend on single-region sellers who are already well served by cheaper point solutions |
| **Partner dependency (filing rails)** | Numeral/Kintsugi/Taxdoo-style partners are infrastructure FiscorAI doesn't control | Build the `FilingRecord` abstraction (build plan Phase 1) partner-agnostic from day one so switching or multi-sourcing filing partners is an integration change, not a rewrite |
| **Trust barrier for financial data + Amazon credentials** | Sellers are being asked to connect SP-API access and hand over the equivalent of their books | Lean on the free Monitor tier as a low-risk on-ramp (no filing authority granted) before asking for filing permissions; pursue SOC 2 in parallel with early build phases, not after |
| **EU fiscal representative liability** | Some EU countries (e.g., Poland) require a fiscal representative jointly liable for a non-EU seller's VAT compliance | Use an established compliance-service partner for these relationships initially (build plan Phase 4) rather than FiscorAI taking on joint liability directly before the company has the balance sheet for it |
| **Platform risk (Amazon SP-API access/policy)** | The entire ingestion model depends on Amazon continuing to grant SP-API access | Maintain the manual CSV upload path as a fallback (already built) even as SP-API becomes primary |

## 8. Next steps

1. Validate the SAM estimate with 10–15 direct conversations with Pan-EU FBA sellers and US multi-state sellers before finalizing Guardian-tier pricing.
2. Make the filing-partner build-vs-buy decision (build plan, "Open technical decisions") — this gates the Phase 4 timeline and therefore the revenue timeline in Section 6.
3. Begin SOC 2 control implementation alongside Phase 1 infrastructure work, not after.
4. Use the free Monitor tier (already close to today's shipped product, extended to UK/US) as the near-term go-to-market wedge while filing infrastructure is built — see companion marketing plan.
