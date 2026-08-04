# Categorizing Amazon Settlement/Transaction Reports

Amazon's report column names vary by report type (Settlement Report, Date Range Transaction Report, VAT Transaction Report, Custom Transaction Report) and Amazon changes them occasionally — treat the mapping below as a strong starting point, not a fixed schema. Always match against what's actually in the user's file, and flag anything that doesn't clearly fit rather than silently guessing.

## Standard mapping

| Amazon report line item (common names) | Bookkeeping category | Notes |
|---|---|---|
| Product sales / Principal | Revenue | The core sale amount before fees |
| Shipping credits | Revenue (shipping income) | Sometimes rolled into total revenue instead of a separate line — ask if the user wants it separated |
| Promotion rebate / Promotional rebate | Contra-revenue (sales discount) | Reduces gross revenue |
| Refunds / Refund — principal | Contra-revenue (returns/refunds) | |
| Refund commission | Reduces the selling fee expense (partial fee refund on returns) | |
| Selling fees / Referral fee | Selling expense (marketplace commission) | Typically 8–15% of sale price depending on category |
| FBA fulfillment fee | Selling expense (fulfillment/COGS-adjacent) | Some businesses treat this as COGS instead of opex — ask the user's convention, both are defensible |
| FBA storage fee / Monthly storage fee | Selling expense (storage) | |
| FBA long-term storage fee | Selling expense (storage) | Flag separately if material — often a sign of slow-moving inventory worth discussing |
| Removal order fee / Disposal fee | Selling expense (inventory management) | |
| Refund administration fee | Selling expense | |
| Shipping chargeback | Selling expense (rare, dispute-related) | |
| Sponsored Products / Sponsored Brands charges | Advertising expense | Usually on a separate Amazon Ads invoice, not the settlement report — check both sources |
| Tax collected by Amazon (Marketplace Facilitator Tax) | Sales tax collected liability (pass-through, not revenue or expense) | This is money Amazon collected and will remit — it should not hit the P&L as income; if it appears as a deduction elsewhere in the report, that's Amazon netting the remittance, not a real expense to the seller |
| VAT collected / VAT on fees | VAT payable / VAT input, depending on direction | UK/EU sellers only; route to a VAT control account, not general revenue or expense |
| Gift wrap credits/fees | Revenue / selling expense (usually immaterial) | |
| Reserve balance / Amazon holding funds | Not a P&L item — track as a receivable/current asset until released | Common source of confusion: it's not lost money, it just hasn't hit the bank yet |
| Currency conversion fee | Bank/financial expense | Common when Amazon converts payouts across currencies (e.g., EU seller getting paid in a non-home currency) |
| Loan repayment / Amazon Lending | Not a P&L item — reduces a liability | If the seller has an Amazon Lending loan |

## Categorization workflow

1. Read the actual column headers from the file — don't assume the table above is exhaustive.
2. Map each line item to a category using the table as a starting point.
3. Group and sum by category so the output is usable directly in a ledger (one row per category per period, not one row per transaction, unless the user specifically wants transaction-level detail).
4. Call out explicitly: (a) any line item you couldn't confidently categorize, (b) any pass-through items (tax collected, reserve balances) that shouldn't be mistaken for revenue or expense, (c) any figure that looks like it might need to be split between two categories (e.g., FBA fulfillment fee treated as COGS vs. opex) and ask the user's preference if it's not already established.
5. Output as a clean table; if the user wants it importable into a spreadsheet, structure it as CSV-ready rows (Date, Description, Category, Amount).
