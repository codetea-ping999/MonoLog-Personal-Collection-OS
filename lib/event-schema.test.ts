import { describe, expect, it } from "vitest";
import { deriveMaintenanceState, normalizeEvent, parseItemEventPayload, parseNullableNumber, sortTimeline, todayInTokyo } from "./event-schema";

const base = { type: "maintenance", occurred_on: "2026-11-01", title: "弦交換", note: "", amount_yen: "1,980", usage_reading: "", next_due_on: "2027-02-01", next_due_usage: "" };

describe("parseItemEventPayload", () => {
  it("accepts a maintenance record with a next due date and yen amount", () => {
    const result = parseItemEventPayload(base);
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ amount_yen: 1980, usage_reading: null, next_due_on: "2027-02-01", next_due_usage: null });
  });

  it("rejects next-due fields on non-maintenance events", () => {
    expect(parseItemEventPayload({ ...base, type: "use" }).success).toBe(false);
  });

  it("rejects impossible dates, due dates before the event, and partial numbers", () => {
    expect(parseItemEventPayload({ ...base, occurred_on: "2026-02-30" }).success).toBe(false);
    expect(parseItemEventPayload({ ...base, next_due_on: "2026-10-01" }).success).toBe(false);
    expect(parseItemEventPayload({ ...base, amount_yen: "12abc" }).success).toBe(false);
    expect(parseItemEventPayload({ ...base, amount_yen: "-5" }).success).toBe(false);
  });

  it("rejects a usage threshold below the current reading", () => {
    expect(parseItemEventPayload({ ...base, next_due_on: "", usage_reading: "5000", next_due_usage: "4000" }).success).toBe(false);
  });
});

describe("parseNullableNumber", () => {
  it("treats empty strings as null and keeps decimals", () => {
    expect(parseNullableNumber("")).toBeNull();
    expect(parseNullableNumber(" 12,500.5 ")).toBe(12500.5);
    expect(Number.isNaN(parseNullableNumber("1e3"))).toBe(true);
  });
});

describe("normalizeEvent", () => {
  it("converts numeric strings from Postgres into numbers", () => {
    const event = normalizeEvent({ id: "e", user_id: "u", item_id: "i", type: "use", occurred_on: "2026-11-01", title: "t", note: "", amount_yen: null, usage_reading: "120.50", next_due_on: null, next_due_usage: null, created_at: "", updated_at: "" });
    expect(event.usage_reading).toBe(120.5);
  });
});

const event = (overrides: Partial<Parameters<typeof deriveMaintenanceState>[0][number]>) => ({
  type: "maintenance" as const,
  occurred_on: "2026-11-01",
  created_at: "2026-11-01T00:00:00Z",
  usage_reading: null,
  next_due_on: null,
  next_due_usage: null,
  ...overrides,
});

describe("deriveMaintenanceState", () => {
  it("returns none without a scheduled maintenance", () => {
    expect(deriveMaintenanceState([], "2026-11-19").status).toBe("none");
    expect(deriveMaintenanceState([event({})], "2026-11-19").status).toBe("none");
  });

  it("classifies ok, due soon, and overdue by date", () => {
    expect(deriveMaintenanceState([event({ next_due_on: "2026-12-31" })], "2026-11-19").status).toBe("ok");
    expect(deriveMaintenanceState([event({ next_due_on: "2026-12-03" })], "2026-11-19")).toMatchObject({ status: "due_soon", daysUntilDue: 14 });
    expect(deriveMaintenanceState([event({ next_due_on: "2026-11-18" })], "2026-11-19")).toMatchObject({ status: "overdue", daysUntilDue: -1 });
  });

  it("marks overdue when any later usage reading reaches the threshold", () => {
    const events = [
      event({ usage_reading: 10000, next_due_usage: 15000 }),
      event({ type: "use", occurred_on: "2026-11-10", usage_reading: 15200 }),
    ];
    expect(deriveMaintenanceState(events, "2026-11-19")).toMatchObject({ status: "overdue", latestUsage: 15200 });
  });

  it("uses only the latest maintenance record", () => {
    const events = [
      event({ occurred_on: "2026-01-01", next_due_on: "2026-03-01" }),
      event({ occurred_on: "2026-10-01", next_due_on: "2027-04-01" }),
    ];
    expect(deriveMaintenanceState(events, "2026-11-19")).toMatchObject({ status: "ok", nextDueOn: "2027-04-01" });
  });
});

describe("timeline helpers", () => {
  it("sorts newest first, breaking ties by creation time", () => {
    const sorted = sortTimeline([
      { id: "a", occurred_on: "2026-01-01", created_at: "2026-01-01T00:00:00Z" },
      { id: "b", occurred_on: "2026-02-01", created_at: "2026-02-01T00:00:00Z" },
      { id: "c", occurred_on: "2026-02-01", created_at: "2026-02-02T00:00:00Z" },
    ]);
    expect(sorted.map((item) => item.id)).toEqual(["c", "b", "a"]);
  });

  it("computes today's date in Japan time", () => {
    expect(todayInTokyo(new Date("2026-11-19T16:00:00Z"))).toBe("2026-11-20");
  });
});
