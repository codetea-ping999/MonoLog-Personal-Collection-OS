import { describe, expect, it } from "vitest";
import { ItemInputSchema, findSimilarItems, normalizeItemName } from "./item-schema";
import { parseItemTransitionPayload } from "./event-schema";

const item = { name: "Stratocaster", kind: "other" as const, status: "wishlist" as const, tags: [], rating: null, note: "" };

describe("wishlist fields", () => {
  it("defaults the new fields to null so existing callers keep working", () => {
    const result = ItemInputSchema.parse(item);
    expect(result).toMatchObject({ wish_price_yen: null, source_url: null, priority: null });
  });

  it("accepts a price, http(s) URL, and priority", () => {
    expect(ItemInputSchema.safeParse({ ...item, wish_price_yen: 39800, source_url: "https://example.com/item", priority: 1 }).success).toBe(true);
  });

  it("rejects non-http URLs, negative prices, and unknown priorities", () => {
    expect(ItemInputSchema.safeParse({ ...item, source_url: "javascript:alert(1)" }).success).toBe(false);
    expect(ItemInputSchema.safeParse({ ...item, wish_price_yen: -1 }).success).toBe(false);
    expect(ItemInputSchema.safeParse({ ...item, priority: 4 }).success).toBe(false);
  });
});

describe("findSimilarItems", () => {
  const candidates = [
    { id: "1", name: "ＳＴＲＡＴＯＣＡＳＴＥＲ", kind: "other" as const, status: "owned" as const },
    { id: "2", name: "Fender Stratocaster '62", kind: "music" as const, status: "owned" as const },
    { id: "3", name: "Telecaster", kind: "other" as const, status: "owned" as const },
  ];

  it("normalizes width, case, spaces, and punctuation", () => {
    expect(normalizeItemName(" Ｆｅｎｄｅｒ  Strat-o ")).toBe("fenderstrato");
  });

  it("finds exact and containing matches, exact and same-kind first", () => {
    expect(findSimilarItems("stratocaster", "other", candidates).map((match) => match.id)).toEqual(["1", "2"]);
  });

  it("ignores very short names", () => {
    expect(findSimilarItems("s", null, candidates)).toEqual([]);
  });
});

describe("parseItemTransitionPayload", () => {
  it("fills a default title and parses the amount", () => {
    const result = parseItemTransitionPayload({ type: "purchase", occurred_on: "2026-11-19", amount_yen: "39,800", note: "" });
    expect(result.success && result.data).toMatchObject({ title: "購入", amount_yen: 39800 });
  });

  it("rejects non-transition event types", () => {
    expect(parseItemTransitionPayload({ type: "maintenance", occurred_on: "2026-11-19" }).success).toBe(false);
  });
});
