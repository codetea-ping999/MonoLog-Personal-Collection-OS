import { describe, expect, it } from "vitest";
import { computeAnalytics, fillPeriods, type AnalyticsEvent, type AnalyticsItem } from "./analytics";
import { csvCell, toCsv } from "./csv";

const items: AnalyticsItem[] = [
  { id: "g1", kind: "music", status: "owned", created_at: "2026-01-05T00:00:00Z", current_value_yen: 120000 },
  { id: "g2", kind: "music", status: "archived", created_at: "2026-03-01T00:00:00Z", current_value_yen: null },
  { id: "b1", kind: "book", status: "owned", created_at: "2026-03-10T00:00:00Z", current_value_yen: null },
  { id: "w1", kind: "game", status: "wishlist", created_at: "2026-03-11T00:00:00Z", current_value_yen: null },
];
const events: AnalyticsEvent[] = [
  { item_id: "g1", type: "purchase", occurred_on: "2026-01-05", amount_yen: 100000 },
  { item_id: "g1", type: "maintenance", occurred_on: "2026-03-02", amount_yen: 3000 },
  { item_id: "g2", type: "purchase", occurred_on: "2026-01-20", amount_yen: 50000 },
  { item_id: "g2", type: "sale", occurred_on: "2026-03-01", amount_yen: 40000 },
  { item_id: "b1", type: "purchase", occurred_on: "2026-03-10", amount_yen: null },
  { item_id: "g1", type: "use", occurred_on: "2026-02-01", amount_yen: null },
];

describe("computeAnalytics", () => {
  it("separates purchase cost, upkeep, sales, and recorded value", () => {
    const summary = computeAnalytics(items, events, { granularity: "month" });
    expect(summary.totals).toEqual({ purchase: 150000, upkeep: 3000, sale: 40000, recordedValue: 120000, purchaseOfValuedItems: 100000 });
    expect(summary.itemCount).toBe(4);
    expect(summary.ownedCount).toBe(2);
  });

  it("fills empty months and sums spending per period", () => {
    const { periods } = computeAnalytics(items, events, { granularity: "month" });
    expect(periods.map((row) => row.period)).toEqual(["2026-01", "2026-02", "2026-03"]);
    expect(periods[0]).toMatchObject({ purchase: 150000, spending: 150000, addedItems: 1 });
    expect(periods[1]).toMatchObject({ spending: 0, addedItems: 0 });
    expect(periods[2]).toMatchObject({ upkeep: 3000, sale: 40000, spending: 3000, addedItems: 3 });
  });

  it("filters by kind and reports missing data instead of counting it as zero", () => {
    const books = computeAnalytics(items, events, { granularity: "year", kind: "book" });
    expect(books.totals.purchase).toBe(0);
    expect(books.coverage).toEqual({ ownedWithoutPurchaseAmount: 1, ownedWithoutRecordedValue: 1, eventsWithoutAmount: 1 });
    expect(books.periods.map((row) => row.period)).toEqual(["2026"]);
  });

  it("handles an empty collection", () => {
    const summary = computeAnalytics([], [], { granularity: "month" });
    expect(summary.periods).toEqual([]);
    expect(summary.totals.purchase).toBe(0);
  });
});

describe("fillPeriods", () => {
  it("crosses year boundaries", () => {
    expect(fillPeriods(["2026-02", "2025-11"], "month")).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
  });
});

describe("CSV", () => {
  it("quotes separators and neutralizes formulas but keeps negative numbers", () => {
    expect(csvCell('a,"b"')).toBe('"a,""b"""');
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell("-5")).toBe("-5");
    expect(csvCell(["x", "y"])).toBe('"x, y"');
    expect(csvCell(null)).toBe("");
  });

  it("starts with a BOM and uses CRLF", () => {
    expect(toCsv(["名称"], [["本"]])).toBe("﻿名称\r\n本\r\n");
  });
});
