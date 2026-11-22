import { describe, expect, it } from "vitest";
import { buildProposals, defaultAccepted, ItemSuggestionSchema } from "./types";
import { parseSuggestionJson } from "./anthropic";
import { getSuggestionProvider } from "./provider";

const empty = { name: "", kind: "other" as const, tags: [], note: "" };

describe("buildProposals", () => {
  it("proposes only what the provider returned and marks empty-field fills as non-replacing", () => {
    const proposals = buildProposals({ name: "Abbey Road", kind: "music", tags: ["vinyl"] }, empty);
    expect(proposals.map((p) => p.field)).toEqual(["name", "kind", "tags"]);
    expect(proposals.every((p) => !p.replaces)).toBe(true);
    expect(defaultAccepted(proposals)).toEqual({ name: true, kind: true, tags: true, note: false });
  });

  it("never pre-accepts a proposal that would overwrite existing input", () => {
    const proposals = buildProposals({ name: "Abbey Road", note: "New note" }, { ...empty, name: "my own title", note: "kept" });
    expect(proposals.every((p) => p.replaces)).toBe(true);
    expect(defaultAccepted(proposals)).toEqual({ name: false, kind: false, tags: false, note: false });
  });

  it("drops proposals equal to the current value and produces none for an empty suggestion", () => {
    expect(buildProposals({ name: "Same" }, { ...empty, name: "Same" })).toEqual([]);
    expect(buildProposals({}, empty)).toEqual([]);
  });
});

describe("provider output validation", () => {
  it("extracts JSON from surrounding text", () => {
    expect(parseSuggestionJson('Here you go: {"name":"Strat","kind":"other","confidence":{"name":0.8}} done').name).toBe("Strat");
  });

  it("rejects invalid kinds, out-of-range confidence, and non-JSON", () => {
    expect(() => parseSuggestionJson('{"kind":"weapon"}')).toThrow();
    expect(ItemSuggestionSchema.safeParse({ confidence: { name: 3 } }).success).toBe(false);
    expect(() => parseSuggestionJson("no json")).toThrow();
  });
});

describe("getSuggestionProvider", () => {
  it("is disabled unless provider, key, and model are all configured", () => {
    expect(getSuggestionProvider({})).toBeNull();
    expect(getSuggestionProvider({ AI_PROVIDER: "anthropic", ANTHROPIC_API_KEY: "k" })).toBeNull();
    expect(getSuggestionProvider({ AI_PROVIDER: "other", ANTHROPIC_API_KEY: "k", AI_MODEL: "m" })).toBeNull();
    expect(getSuggestionProvider({ AI_PROVIDER: "anthropic", ANTHROPIC_API_KEY: "k", AI_MODEL: "m" })?.id).toBe("anthropic");
  });
});
