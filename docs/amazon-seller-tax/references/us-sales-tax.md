# US Sales Tax for Amazon Sellers

Snapshot as of 2026. Thresholds and marketplace facilitator rules change; verify current figures with a CPA or a nexus-tracking tool (e.g., TaxJar, Avalara) before acting.

## Two separate layers to keep straight

1. **Economic/physical nexus** — whether the state considers you to have enough of a connection to owe tax obligations there at all.
2. **Marketplace facilitator laws** — whether Amazon (or another marketplace) is legally required to collect and remit the sales tax on your behalf, even if you have nexus.

Having nexus does not mean you personally have to collect tax if Amazon is already doing it as marketplace facilitator. But it usually still means you have a **registration and filing obligation** in that state, and nexus for sales tax purposes can also imply nexus for state income/franchise tax, which marketplace facilitator laws do *not* cover. Don't tell a user "you're covered" just because Amazon collects the sales tax — check what's actually being asked.

## Economic nexus thresholds (remote seller revenue thresholds)

- Most common: **$100,000** in annual sales into the state (the large majority of states with a sales tax use this figure; many states dropped transaction-count triggers like "200 transactions" in recent years — check the specific state, don't assume a transaction count still applies).
- Higher thresholds: **California and Texas use $500,000**; **New York uses $500,000 plus a 100-transaction count** (New York still has the transaction test — an exception to the general trend).
- A couple of states use **$250,000**.
- States with no general sales tax (so no economic nexus issue for sales tax): Alaska (but has local sales taxes in some jurisdictions), Delaware, Montana, New Hampshire, Oregon.

Because this changes and varies by state, when giving a specific number for a specific state, flag it as something to double-check rather than stating it as unconditionally current.

## FBA inventory and physical nexus

Storing inventory in a state is a classic trigger for **physical presence nexus**, independent of the revenue thresholds above. Amazon redistributes FBA inventory across its fulfillment network without the seller's day-to-day input, which means an FBA seller can end up with physical nexus in dozens of states simply from where Amazon chose to store stock — not from anything the seller decided.

Practical implications:
- A seller can have physical nexus (from inventory) in states well before they'd ever cross that state's economic/revenue threshold.
- Physical nexus historically triggered a direct sales-tax-collection obligation; today, in states with marketplace facilitator laws, Amazon still collects/remits on marketplace sales — but the seller may still need to register, and physical nexus is very relevant to **state income tax and franchise tax** exposure, which is a separate question from sales tax.
- Sellers can check where their inventory is currently stored via Seller Central's inventory event/placement reports — this is the starting point for a real nexus analysis, not a general assumption.

## Marketplace facilitator laws

All US states that impose a sales tax (plus Washington DC) now have marketplace facilitator laws, meaning Amazon collects and remits sales tax on the seller's behalf for sales made through Amazon in those states. Important nuances:

- This generally covers **sales made through the marketplace**. If the seller also sells direct (their own website, other channels), those sales are not covered by Amazon's collection and are the seller's own responsibility.
- Marketplace-facilitated sales still typically **count toward the seller's economic nexus threshold calculation** even though Amazon is the one remitting — crossing the threshold can still trigger a registration/filing requirement in the state, even if there's nothing left to actually pay because Amazon already remitted it.
- Some states require sellers to still file a return showing marketplace sales (sometimes as an information return, sometimes as a deduction on an otherwise-filed return) even when no tax is due directly from the seller.

## Income tax / franchise tax nexus (separate from sales tax nexus — don't skip this)

Sales tax nexus and income/franchise tax nexus are determined independently, by different thresholds, and marketplace facilitator laws do **not** touch income/franchise tax at all — Amazon collecting sales tax says nothing about whether the seller owes a state income or franchise tax return. A seller can be fully "covered" on sales tax and still have an unmet income/franchise tax filing obligation in the same state. Always check both, not just sales tax nexus, when a seller asks a broad "do I owe anything here" question.

Most states use an economic nexus standard for income/franchise tax similar in spirit to the sales tax version (a revenue threshold, sometimes combined with a percentage-of-total-sales test or property/payroll factors), but the actual thresholds are usually different numbers from the sales tax thresholds in the same state — don't assume they match.

**California is the highest-profile example and worth knowing as a pattern, not just a fact:** California's "doing business" standard (R&TC §23101) is triggered if in-state sales exceed the lesser of an inflation-adjusted dollar threshold (roughly $750,000+, adjusts annually — confirm the current-year figure) **or 25% of the entity's total sales**. A seller with a high concentration of revenue in California (as in the worked example above, where CA was 80% of total revenue) will typically trip the 25%-of-sales test long before reaching the absolute dollar threshold. If triggered, an out-of-state LLC generally must register as a foreign entity with the CA Secretary of State and file Form 568, owing the flat **$800/year minimum franchise tax** (this applies regardless of income) plus a **graduated LLC fee** based on California-source gross receipts (roughly: $0 under $250k, $900 from $250k–$499,999, $2,500 from $500k–$999,999, rising further at higher tiers) — confirm the current fee schedule, it's periodically adjusted.

The general pattern to apply to any state: (1) does this state have a corporate/LLC income or franchise tax at all — a handful of states don't; (2) what's its nexus standard (economic, physical, or both) and threshold; (3) is there a flat minimum fee/tax layered on top of an income-based calculation, as CA does. Don't extrapolate California's specific numbers to other states — treat it as the mechanism to look for, not the answer for every state.

## Filing checklist building blocks (for the filing/deadline checklist output)

For each state where the seller has nexus, work out:
- **Sales tax registration** — required if nexus exists, generally regardless of whether Amazon remits.
- **Sales tax return** — frequency (monthly/quarterly/annual, based on volume) and whether it's a full return or a marketplace-sales-only informational filing.
- **State income tax / franchise tax** — separate analysis; some states (e.g., Texas margin tax) apply based on economic presence, not just physical.
- **Federal** — Schedule C (sole proprietor/single-member LLC) or the relevant business return (1120/1120-S/1065) depending on entity type; this doesn't depend on state nexus, it depends on having a US filing obligation at all.
- **Sales tax permit renewal** — some states require periodic renewal, don't assume "register once" is the end of it.

Give deadlines as *rules* (e.g., "quarterly returns due the 20th of the month following the quarter") rather than specific calendar dates unless the user has given you their actual registration/filing frequency.
