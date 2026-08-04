# EU VAT for Amazon Sellers

Snapshot as of 2026. VAT rates and OSS/IOSS rules vary by member state and change periodically — verify current figures with an EU VAT advisor (or a service like hellotax, Avalara, Marosa) before acting, especially before registering or deregistering anywhere.

## The €10,000 OSS threshold only applies to EU-established sellers

Same structure as the UK case, and just as easy to get backwards:

- **EU-established sellers**: intra-EU B2C distance sales of goods (plus certain digital/TBE services) are covered by a single **EU-wide €10,000/year threshold** (net of VAT, combined across all destination countries — not €10,000 per country). Below it, the seller can charge their home country's VAT rate on cross-border sales. Above it, VAT is owed at the **destination country's** rate, either via local registration in each country or via the **One Stop Shop (OSS)** single return.
- **Non-EU-established sellers** (US, UK, elsewhere): **do not get the €10,000 threshold**. VAT is owed in the relevant EU country from the first sale where nexus/registration is triggered — there's no "under the threshold, use home rate" option because there's no EU home rate to default to.

## Amazon Pan-EU / Multi-Country Inventory is the biggest EU-specific trap

This is the detail most generic VAT explainers miss and that matters most for Amazon sellers specifically:

- If the seller uses **Pan-European FBA** or **Multi-Country Inventory**, Amazon distributes stock across fulfillment centers in multiple EU countries (commonly Germany, France, Italy, Spain, Poland, Czech Republic) to speed up delivery.
- **Simply having inventory physically stored in a country creates a VAT registration obligation in that country**, independent of sales volume and independent of the €10,000 OSS threshold — that threshold is about *distance sales*, not about *where you store goods*. A seller with one unit of inventory sitting in a Polish fulfillment center has a Polish VAT registration obligation, threshold or no threshold.
- This means a Pan-EU FBA seller can end up needing **VAT registrations in five or six EU countries simultaneously**, and OSS does *not* replace those registrations — OSS covers reporting for distance sales, not for VAT arising from local inventory storage.
- If the user mentions Pan-EU FBA or Multi-Country Inventory, treat "which countries is my stock actually in" as a required question, not an optional detail — pull it from Seller Central's inventory reports if possible.

## Import VAT / IOSS

- For goods shipped from outside the EU directly to EU consumers, valued at **€150 or less**, the **Import One Stop Shop (IOSS)** allows VAT to be collected at the point of sale and remitted via a single monthly return, avoiding import VAT/customs delays. Above €150, standard import VAT and customs procedures apply.
- Marketplaces like Amazon may already be the deemed supplier and handle IOSS themselves for qualifying transactions — similar dynamic to the UK's deemed-supplier rule. Check whether the specific sale is Amazon-facilitated before assuming the seller needs to register for IOSS themselves.

## VAT rates (indicative — always confirm current rate for the specific country and product category)

Standard VAT rates vary meaningfully by country, roughly in the 17–27% range (e.g., Germany ~19%, France ~20%, Italy ~22%, Poland ~23%, Hungary ~27%). Many countries also have reduced rates for specific goods. Don't state a specific country's rate confidently without flagging that it should be verified — these do change.

## Filing basics

- **OSS returns**: filed quarterly, covering all OSS-eligible distance sales across the EU in one return, submitted via the OSS portal in the seller's country of identification (home country for EU sellers; a chosen member state for non-EU sellers who register there).
- **Local VAT registrations** (e.g., from Pan-EU inventory storage): each country has its own filing frequency and portal — these are separate from and in addition to OSS, not replaced by it.
