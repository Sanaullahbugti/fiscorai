---
name: amazon-seller-tax
description: Helps Amazon (and other e-commerce) sellers navigate US sales tax, UK VAT, and EU VAT obligations — nexus/registration threshold checks, Amazon settlement/transaction report categorization for bookkeeping, and filing/deadline checklists. Use this skill whenever the user mentions Amazon seller taxes, FBA sales tax, VAT registration, economic nexus, Seller Central settlement reports, OSS/IOSS, sales tax by state, or asks anything about accounting or tax compliance for an e-commerce/marketplace business selling into the US, UK, or EU — even if they don't say "tax" explicitly, e.g. "do I need to register somewhere new", "categorize my Amazon payouts", or "what do I owe HMRC this quarter". Always route to the correct jurisdiction reference file(s) before answering, and always include the standard disclaimer that this is not a substitute for a licensed accountant or tax advisor.
---

# Amazon Seller Tax & Accounting Helper

## Why this exists

Amazon (and similar marketplace) sellers face a genuinely unusual tax situation: inventory gets redistributed across fulfillment centers without the seller's direct control, which can create tax obligations in places they never chose to do business. At the same time, marketplace facilitator laws and EU/UK deemed-supplier rules mean the marketplace itself is now collecting and remitting tax on many transactions — so the seller's own obligations are narrower than they used to be, but not zero. Getting this wrong in either direction (under-registering, or panicking and over-registering) costs real money. This skill exists to help sellers reason through where they actually owe something, and to turn messy Amazon reports into clean bookkeeping data.

**This skill produces working analysis and drafts, not filed returns.** Tax rules shift year to year (thresholds, rates, marketplace rules), so always end substantive answers with a reminder to confirm current figures with a licensed accountant/tax advisor in the relevant jurisdiction before acting — especially before registering, deregistering, or filing anything.

## Workflow

1. **Figure out what the user actually needs.** This skill covers four kinds of tasks — identify which one (or which combination) applies:
   - **Nexus/VAT registration check** — "do I owe tax / need to register somewhere new?"
   - **Transaction categorization** — turning an Amazon settlement/transaction report into clean bookkeeping categories
   - **Filing/deadline checklist** — what returns are due, when, for the jurisdictions the seller is active in
   - **General Q&A** — a specific rules question ("what's the VAT rate in Germany", "does FBA inventory create nexus in Texas")

2. **Establish the seller's footprint before answering anything.** You cannot give a correct answer without knowing:
   - Where the business is legally established/incorporated (this changes which threshold rules even apply — see the "non-established seller" notes in each reference file, they're not a footnote, they flip the whole analysis)
   - Which countries/states they sell into, and roughly what revenue in each
   - Whether they use FBA, and if so, whether Pan-EU/Multi-Country Inventory or FBA storage across multiple US states is in play — inventory location matters as much as sales volume
   - If unclear, ask rather than assume. A US LLC storing inventory only in US warehouses has a very different exposure profile than a UK sole trader using Amazon's Pan-EU program.

3. **Route to the relevant reference file(s).** Read only what's needed for the jurisdictions in play:
   - `references/us-sales-tax.md` — economic nexus thresholds, marketplace facilitator laws, FBA inventory nexus, filing checklist
   - `references/uk-vat.md` — UK VAT registration threshold, non-established seller rules, online marketplace deemed-supplier rules, VAT return basics
   - `references/eu-vat.md` — OSS/IOSS thresholds, non-EU seller rules, Pan-EU FBA multi-country registration triggers, VAT rates by country
   - `references/transaction-categorization.md` — mapping Amazon Seller Central report line items to standard bookkeeping categories

4. **For categorization tasks**, ask for (or read, if attached) the actual report — Amazon's column names vary by report type (Settlement Report, Date Range Transaction Report, VAT Transaction Report) and change occasionally, so match against what's actually in the file rather than assuming a fixed schema. Flag any line item that doesn't clearly map to a category instead of guessing silently.

5. **For nexus/registration and filing checklist answers**, be explicit about the difference between:
   - Obligations the *marketplace* now handles (e.g., Amazon collecting/remitting sales tax under US marketplace facilitator laws, or acting as deemed supplier for UK/EU VAT on qualifying sales)
   - Obligations that remain the *seller's* even when Amazon collects tax on the sale itself (e.g., many US states still require a sales tax return/registration even when Amazon remits; income tax and franchise tax nexus are separate from sales tax nexus; VAT registration may still be needed for reclaiming import VAT or for B2B sales Amazon doesn't cover)
   Conflating these two is the single most common and costly mistake sellers make — don't let an answer imply "Amazon handles it" without checking whether that's actually true for the specific obligation being asked about.

6. **Close with the disclaimer** (vary the wording naturally, don't paste it verbatim every time, but always convey it): this is a working analysis based on current publicly available thresholds/rules, not personalized tax advice, and the user should confirm specifics with a licensed accountant or tax advisor before registering, filing, or making a compliance decision — especially since thresholds and marketplace rules change and this skill's reference figures have a point-in-time snapshot.

## Output formats

- **Nexus/VAT check**: a short table or list of jurisdictions with status (registered / threshold crossed — register / approaching threshold — monitor / no action needed) and the reasoning for each, not just a verdict.
- **Categorization**: a clean table (or CSV-ready output) mapping each transaction/line item to category, with a short note on anything ambiguous.
- **Filing checklist**: grouped by jurisdiction, each item with what it is, frequency, and rough deadline logic (exact dates depend on registration date, so give the rule not a specific date unless the user gave you their registration date).
- **General Q&A**: answer the question directly first, then add relevant context (e.g., how it interacts with FBA) — don't pad with the full reference file's contents.
