import type { ItemEventType } from "@/lib/event-schema";
import type { ItemKind, ItemStatus } from "@/lib/item-schema";

export type AnalyticsItem = {
  id: string;
  kind: ItemKind;
  status: ItemStatus;
  created_at: string;
  current_value_yen: number | null;
};

export type AnalyticsEvent = {
  item_id: string;
  type: ItemEventType;
  occurred_on: string;
  amount_yen: number | null;
};

export type Granularity = "month" | "year";

export type PeriodRow = {
  period: string;
  purchase: number;
  upkeep: number;
  sale: number;
  /** purchase + upkeep (maintenance, modification, disposal costs) */
  spending: number;
  addedItems: number;
};

export type AnalyticsSummary = {
  itemCount: number;
  ownedCount: number;
  byKind: Array<{ kind: ItemKind; count: number }>;
  byStatus: Array<{ status: ItemStatus; count: number }>;
  totals: {
    purchase: number;
    upkeep: number;
    sale: number;
    /** Sum of current_value_yen for items that are owned or borrowed. */
    recordedValue: number;
    /** Purchase cost of the items that also have a recorded value, for a like-for-like comparison. */
    purchaseOfValuedItems: number;
  };
  coverage: {
    ownedWithoutPurchaseAmount: number;
    ownedWithoutRecordedValue: number;
    eventsWithoutAmount: number;
  };
  periods: PeriodRow[];
};

const UPKEEP_TYPES: ReadonlySet<ItemEventType> = new Set(["maintenance", "modification", "disposal"]);
const HELD_STATUSES: ReadonlySet<ItemStatus> = new Set(["owned", "borrowed"]);
const MONEY_EVENT_TYPES: ReadonlySet<ItemEventType> = new Set(["purchase", "sale", "maintenance", "modification", "disposal"]);

export function periodOf(date: string, granularity: Granularity) {
  return granularity === "year" ? date.slice(0, 4) : date.slice(0, 7);
}

/** Every period between the first and last key, so charts show gaps as zero instead of skipping them. */
export function fillPeriods(keys: string[], granularity: Granularity): string[] {
  if (keys.length === 0) return [];
  const sorted = [...keys].sort();
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const result: string[] = [];
  if (granularity === "year") {
    for (let year = Number(first); year <= Number(last); year += 1) result.push(String(year));
    return result;
  }
  let [year, month] = first.split("-").map(Number);
  const [lastYear, lastMonth] = last.split("-").map(Number);
  while (year < lastYear || (year === lastYear && month <= lastMonth)) {
    result.push(`${year}-${String(month).padStart(2, "0")}`);
    month += 1;
    if (month > 12) { month = 1; year += 1; }
  }
  return result;
}

/**
 * Pure aggregation over the owner's items and events. Missing amounts are skipped and
 * reported in `coverage` instead of being treated as zero-cost purchases.
 */
export function computeAnalytics(
  items: AnalyticsItem[],
  events: AnalyticsEvent[],
  options: { granularity: Granularity; kind?: ItemKind | null; maxPeriods?: number },
): AnalyticsSummary {
  const { granularity, kind = null, maxPeriods = granularity === "month" ? 24 : 20 } = options;
  const scopedItems = kind ? items.filter((item) => item.kind === kind) : items;
  const itemIds = new Set(scopedItems.map((item) => item.id));
  const scopedEvents = events.filter((event) => itemIds.has(event.item_id));

  const byKind = new Map<ItemKind, number>();
  const byStatus = new Map<ItemStatus, number>();
  for (const item of scopedItems) {
    byKind.set(item.kind, (byKind.get(item.kind) ?? 0) + 1);
    byStatus.set(item.status, (byStatus.get(item.status) ?? 0) + 1);
  }

  const rows = new Map<string, PeriodRow>();
  const row = (period: string) => {
    let current = rows.get(period);
    if (!current) {
      current = { period, purchase: 0, upkeep: 0, sale: 0, spending: 0, addedItems: 0 };
      rows.set(period, current);
    }
    return current;
  };

  const totals = { purchase: 0, upkeep: 0, sale: 0, recordedValue: 0, purchaseOfValuedItems: 0 };
  const purchaseByItem = new Map<string, number>();
  let eventsWithoutAmount = 0;

  for (const event of scopedEvents) {
    if (!MONEY_EVENT_TYPES.has(event.type)) continue;
    if (event.amount_yen === null) {
      if (event.type === "purchase" || event.type === "sale") eventsWithoutAmount += 1;
      continue;
    }
    const target = row(periodOf(event.occurred_on, granularity));
    if (event.type === "purchase") {
      target.purchase += event.amount_yen;
      totals.purchase += event.amount_yen;
      purchaseByItem.set(event.item_id, (purchaseByItem.get(event.item_id) ?? 0) + event.amount_yen);
    } else if (event.type === "sale") {
      target.sale += event.amount_yen;
      totals.sale += event.amount_yen;
    } else if (UPKEEP_TYPES.has(event.type)) {
      target.upkeep += event.amount_yen;
      totals.upkeep += event.amount_yen;
    }
  }

  let ownedWithoutPurchaseAmount = 0;
  let ownedWithoutRecordedValue = 0;
  for (const item of scopedItems) {
    row(periodOf(item.created_at.slice(0, 10), granularity)).addedItems += 1;
    if (!HELD_STATUSES.has(item.status)) continue;
    if (!purchaseByItem.has(item.id)) ownedWithoutPurchaseAmount += 1;
    if (item.current_value_yen === null) {
      ownedWithoutRecordedValue += 1;
    } else {
      totals.recordedValue += item.current_value_yen;
      totals.purchaseOfValuedItems += purchaseByItem.get(item.id) ?? 0;
    }
  }

  const periods = fillPeriods([...rows.keys()], granularity)
    .slice(-maxPeriods)
    .map((period) => {
      const current = rows.get(period) ?? { period, purchase: 0, upkeep: 0, sale: 0, spending: 0, addedItems: 0 };
      return { ...current, spending: current.purchase + current.upkeep };
    });

  return {
    itemCount: scopedItems.length,
    ownedCount: scopedItems.filter((item) => HELD_STATUSES.has(item.status)).length,
    byKind: [...byKind.entries()].map(([itemKind, count]) => ({ kind: itemKind, count })).sort((a, b) => b.count - a.count),
    byStatus: [...byStatus.entries()].map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count),
    totals,
    coverage: { ownedWithoutPurchaseAmount, ownedWithoutRecordedValue, eventsWithoutAmount },
    periods,
  };
}
