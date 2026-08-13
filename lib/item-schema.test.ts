import { describe, expect, it } from "vitest";
import { BULK_ITEM_LIMIT, ItemInputSchema, ITEM_KIND_LABELS, parseBulkNames, parseNullableRating, parseTags } from "./item-schema";

describe("ItemInputSchema", () => {
  it("accepts the complete MVP item shape", () => {
    const result = ItemInputSchema.safeParse({
      name: "The Collection",
      kind: "book",
      status: "owned",
      tags: ["favorite"],
      rating: 5,
      note: "A note",
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid names, kinds, and ratings", () => {
    const result = ItemInputSchema.safeParse({
      name: "",
      kind: "invalid",
      status: "owned",
      tags: [],
      rating: 6,
      note: "",
    });

    expect(result.success).toBe(false);
  });
});

describe("bulk item parsing", () => {
  it("trims lines and removes duplicate names within the submitted batch", () => {
    expect(parseBulkNames(" First \n\nSecond\nFirst ")).toEqual({ names: ["First", "Second"], errors: [], duplicateCount: 1 });
  });

  it("reports names over the length limit and batches over the item limit", () => {
    expect(parseBulkNames("x".repeat(161)).errors[0]).toEqual({ line: 1, message: "名称は160文字以内で入力してください" });
    expect(parseBulkNames(Array.from({ length: BULK_ITEM_LIMIT + 1 }, (_, index) => `Item ${index}`).join("\n")).errors[0]?.message).toContain(String(BULK_ITEM_LIMIT));
  });
});

describe("item parsing helpers", () => {
  it("normalizes tags, removes duplicates, and caps the number of tags", () => {
    const result = parseTags("one, two, one, , three");
    expect(result).toEqual(["one", "two", "three"]);
  });

  it("parses blank ratings as null", () => {
    expect(parseNullableRating(" ")).toBeNull();
    expect(parseNullableRating("4")).toBe(4);
  });

  it("keeps user-facing labels centralized", () => {
    expect(ITEM_KIND_LABELS.book).toBe("本");
  });
});
