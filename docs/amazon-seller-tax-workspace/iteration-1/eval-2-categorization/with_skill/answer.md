# Amazon Settlement Report — Categorized for Bookkeeping

Here's your settlement data mapped to standard bookkeeping categories. I matched each line against typical Amazon terminology, but a couple of items are worth a quick decision on your end — flagged below.

## Transaction-level (CSV-ready)

| Date | Description | Category | Amount |
|---|---|---|---|
| 2026-06-01 | Product sales | Revenue | 4820.00 |
| 2026-06-01 | FBA fulfillment fee | Selling expense — Fulfillment (or COGS, see note) | -612.40 |
| 2026-06-01 | Referral fee | Selling expense — Marketplace commission | -723.00 |
| 2026-06-02 | Refund - principal | Contra-revenue — Returns/refunds | -89.99 |
| 2026-06-02 | Refund commission | Selling expense — Marketplace commission (offset) | 13.50 |
| 2026-06-03 | Marketplace Facilitator Tax | Sales tax collected — pass-through liability, not P&L | -401.20 |
| 2026-06-05 | FBA storage fee | Selling expense — Storage | -145.00 |
| 2026-06-07 | Sponsored Products charge | Advertising expense | -310.00 |
| 2026-06-10 | Shipping credits | Revenue — Shipping income | 62.00 |
| 2026-06-15 | Currency conversion fee | Bank/financial expense | -18.75 |
| 2026-06-20 | Long-term storage fee | Selling expense — Storage (flagged, see note) | -88.00 |

## Grouped summary (for your ledger)

| Category | Amount |
|---|---|
| Revenue (Product sales + Shipping credits) | 4,882.00 |
| Contra-revenue (Refunds — principal) | -89.99 |
| Selling expense — Marketplace commission (Referral fee, net of refund commission) | -709.50 |
| Selling expense — Fulfillment (FBA fulfillment fee) | -612.40 |
| Selling expense — Storage (FBA storage + long-term storage) | -233.00 |
| Advertising expense (Sponsored Products) | -310.00 |
| Bank/financial expense (Currency conversion fee) | -18.75 |
| **Net settlement total** | **2,507.16** |

Not on the P&L at all:
- **Marketplace Facilitator Tax (-$401.20)** — this is sales tax Amazon collected from the buyer and remits directly to the state on your behalf. It should not be booked as your revenue or your expense; it's a pass-through. If you want to track it for reconciliation, put it in a "sales tax collected by marketplace" memo account rather than an income/expense account.

## Notes on the trickier items

- **Marketplace Facilitator Tax** — pass-through only (see above). Don't let it reduce your reported revenue or show up as a tax expense; it was never your money.
- **Refund commission (+$13.50)** — this is Amazon partially refunding the referral fee it charged you when a customer returns an item. I netted it against the Referral fee line rather than treating it as separate income, since it's really "less commission expense," not new revenue.
- **Currency conversion fee** — booked as a bank/financial expense since it's a cost of Amazon converting your payout between currencies, not a selling cost tied to a specific transaction.
- **FBA fulfillment fee** — some sellers book this as COGS instead of a selling expense (both are defensible depending on your convention). I used "selling expense" here; let me know if you'd rather I reclassify it as COGS.
- **Sponsored Products charge** — this usually also appears on a separate Amazon Ads invoice. Worth checking you're not double-counting it if you already log ad spend from that invoice.
- **Long-term storage fee** — categorized as storage expense like the regular FBA storage fee, but flagging it separately since long-term storage charges are usually a signal of slow-moving inventory worth reviewing, not just a routine cost.

This categorization is based on standard Amazon settlement report conventions — it's a solid starting point for your books, but if you have a bookkeeper or accountant, it's worth confirming they want fulfillment fees treated the same way (COGS vs. opex) and that the Marketplace Facilitator Tax pass-through is handled consistently with how your accounting software expects it.
