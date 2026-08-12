import { describe, expect, it } from "vitest";
import { ItemInputSchema, ITEM_KIND_LABELS, parseNullableRating, parseTags } from "./item-schema";

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
