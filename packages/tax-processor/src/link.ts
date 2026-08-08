import type { NormalizedTransaction, RefundLink } from "./canonical-types.js";

export const LINK_STRATEGY_VERSION = "v1-exact-event-id";

export function linkRefunds(rows: NormalizedTransaction[]): NormalizedTransaction[] {
  const salesByEvent = new Map<string, NormalizedTransaction[]>();

  for (const row of rows) {
    if ((row.transactionType.value || "").toUpperCase() !== "SALE") continue;
    const eventId = row.transactionEventId.value;
    if (!eventId) continue;
    const list = salesByEvent.get(eventId) || [];
    list.push(row);
    salesByEvent.set(eventId, list);
  }

  return rows.map((row) => {
    const type = (row.transactionType.value || "").toUpperCase();
    if (type !== "REFUND") {
      return {
        ...row,
        refundLink: {
          status: "not_applicable" as const,
          provenance: "SOURCE_ROW" as const,
          strategyVersion: LINK_STRATEGY_VERSION,
        },
      };
    }

    const eventId = row.transactionEventId.value;
    const candidates = eventId ? salesByEvent.get(eventId) || [] : [];

    let link: RefundLink;
    if (candidates.length === 1) {
      link = {
        status: "matched",
        matchedSourceRow: candidates[0]!.sourceRow,
        matchedTransactionEventId: eventId,
        provenance: "MATCHED_ORIGINAL_TRANSACTION",
        strategyVersion: LINK_STRATEGY_VERSION,
      };
      if (!row.derived.salesDestination.value && candidates[0]!.derived.salesDestination.value) {
        return {
          ...row,
          derived: {
            ...row.derived,
            salesDestination: candidates[0]!.derived.salesDestination,
            reportingDestination: candidates[0]!.derived.reportingDestination,
            provenance: "MATCHED_ORIGINAL_TRANSACTION",
          },
          refundLink: link,
        };
      }
    } else if (candidates.length > 1) {
      link = {
        status: "unmatched",
        matchedTransactionEventId: eventId,
        provenance: "UNRESOLVED",
        strategyVersion: LINK_STRATEGY_VERSION,
      };
    } else if (row.saleArrivalCountry.value || row.saleDepartCountry.value) {
      link = {
        status: "unmatched",
        matchedTransactionEventId: eventId,
        provenance: "SALE_CONTEXT",
        strategyVersion: LINK_STRATEGY_VERSION,
      };
    } else {
      link = {
        status: "unmatched",
        matchedTransactionEventId: eventId,
        provenance: "UNRESOLVED",
        strategyVersion: LINK_STRATEGY_VERSION,
      };
    }

    return { ...row, refundLink: link };
  });
}
