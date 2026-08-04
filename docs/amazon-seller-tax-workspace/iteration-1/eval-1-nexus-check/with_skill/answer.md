# Nexus/Registration Check — Ohio Single-Member LLC, Amazon FBA

Short answer: **no, "Amazon handles it" is not the full picture.** Amazon collecting and remitting sales tax as a marketplace facilitator is a separate thing from whether *you* have a registration/filing obligation in a state. Based on what you've described, California almost certainly requires action from you, Ohio (your home state) likely already does, and the other states probably don't yet — but that last part depends on details you haven't given me (FBA inventory locations, and exactly how that $130k splits across a dozen states).

## The two layers, applied to your numbers

1. **Economic/physical nexus** — do you have enough connection to a state to owe it anything at all (registration, filing)?
2. **Marketplace facilitator laws** — is Amazon legally required to collect/remit the sales tax on the sale itself?

You can have #2 covered (Amazon collects tax on every order) while still owing #1 (a registration and filing requirement) in a given state. Crossing an economic nexus threshold via marketplace sales still generally triggers a registration/filing requirement even though there's nothing left to *pay* — Amazon already remitted it. Some states even require a return just to report the marketplace sales, informational or otherwise.

## Jurisdiction-by-jurisdiction

| State | Status | Reasoning |
|---|---|---|
| **California** | **Threshold crossed — register** | CA's economic nexus threshold is $500,000/year, one of the higher state-specific thresholds (most states use $100k). At ~$520k you're over it. Amazon is collecting/remitting the sales tax itself as marketplace facilitator, but CA will still generally expect you to hold a seller's permit (CDTFA) and file — often as a marketplace-sales return even if $0 is due. If any of your FBA inventory sits in a CA fulfillment center, that's an independent physical-nexus trigger on top of the revenue number. |
| **Ohio (home state)** | **Register — home state generally requires it regardless of revenue** | This one's easy to overlook because the conversation naturally centers on "new" states, but Ohio is where the LLC is organized/based, which is its own nexus basis independent of any threshold. If you don't already hold an Ohio vendor's license, that's worth confirming — it's not contingent on the $650k figure at all. |
| **The other ~dozen states (~$130k combined)** | **Approaching/unclear — needs more info, likely no action yet on revenue alone** | Spread "thin" across a dozen states, that's roughly low five figures per state on average — under the common $100,000 economic nexus threshold most states use, and well under the $250k/$500k thresholds some states set. If the split is genuinely even, none of these probably trigger economic nexus yet. But two things I can't verify from what you've told me: (a) if the split isn't actually even and one or two states are getting a disproportionate share, one could be closer to $100k than "spread thin" suggests; (b) **FBA inventory storage is a separate, physical-presence trigger that doesn't care about your revenue in that state at all** — Amazon redistributes inventory across its fulfillment network without your input, so you could have physical nexus in a state where you've sold almost nothing. You'd need to pull your Seller Central inventory/placement reports to know where stock has actually sat, not just where sales happened. |

## What Amazon is and isn't doing for you

- Amazon, as a marketplace facilitator, is collecting and remitting sales tax on **marketplace sales** in every state that has a sales tax (all of them now have marketplace facilitator laws). That part is handled.
- What it doesn't handle: your **registration/permit obligation** once you have nexus (economic or physical), any **informational filings** some states require even when Amazon already remitted, and — separately — **state income or franchise tax nexus**, which is a distinct analysis from sales tax nexus and isn't touched by marketplace facilitator laws at all. California in particular is known for reaching further than most states on economic-presence-based entity-level obligations; I don't have current thresholds/figures for that in front of me, so flag it specifically with your accountant rather than assuming it mirrors the $500k sales tax number.
- Federal: as a single-member LLC, you're filing Schedule C (unless you've elected corporate taxation) — that's unrelated to any of the above state nexus analysis; it's just a function of having a US business at all.

## Bottom line / next steps

1. Confirm Ohio vendor's license status if you haven't already.
2. Register for a California seller's permit (CDTFA) given the $520k figure — and check whether CA also wants attention on the income/franchise side.
3. Pull your FBA inventory/placement reports to see which states you're physically stored in — that determines whether any of the "spread thin" dozen need registration despite low sales, and also feeds the income/franchise tax question everywhere Amazon has parked your stock.
4. For the smaller states, monitor rather than register for now, unless the inventory report or an uneven revenue split says otherwise.

*This is a working analysis based on current publicly available nexus thresholds and marketplace facilitator rules, not personalized tax advice — thresholds, and especially California's aggressive edge cases, shift over time. Confirm your specific numbers and any registration decision with a licensed CPA or tax advisor before you register, deregister, or file anything.*
