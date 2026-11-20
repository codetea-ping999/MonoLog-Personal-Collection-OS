import { z } from "zod";

export const ITEM_EVENT_TYPES = ["purchase", "sale", "disposal", "maintenance", "use", "modification", "note"] as const;
export const ItemEventTypeSchema = z.enum(ITEM_EVENT_TYPES);
export type ItemEventType = z.infer<typeof ItemEventTypeSchema>;

export const ITEM_EVENT_TYPE_LABELS: Record<ItemEventType, string> = {
  purchase: "購入",
  sale: "売却",
  disposal: "処分",
  maintenance: "メンテナンス",
  use: "使用",
  modification: "改造・カスタム",
  note: "メモ",
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const IsoDateSchema = z
  .string()
  .regex(ISO_DATE, "日付はYYYY-MM-DD形式で入力してください")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "存在しない日付です");

const nullableNonNegative = (max: number, message: string) => z.number({ error: "数値で入力してください" }).min(0, message).max(max, message).nullable();

export const ItemEventInputSchema = z
  .object({
    type: ItemEventTypeSchema,
    occurred_on: IsoDateSchema,
    title: z.string().trim().min(1, "タイトルを入力してください").max(160, "タイトルは160文字以内で入力してください"),
    note: z.string().max(5000, "メモは5000文字以内で入力してください"),
    amount_yen: z.number({ error: "金額は数値で入力してください" }).int("金額は円単位の整数で入力してください").min(0, "金額は0以上で入力してください").max(1_000_000_000_000, "金額が大きすぎます").nullable(),
    usage_reading: nullableNonNegative(999_999_999_999, "使用量・走行距離は0以上で入力してください"),
    next_due_on: IsoDateSchema.nullable(),
    next_due_usage: nullableNonNegative(999_999_999_999, "次回の目安は0以上で入力してください"),
  })
  .superRefine((value, context) => {
    if (value.type !== "maintenance" && (value.next_due_on !== null || value.next_due_usage !== null)) {
      context.addIssue({ code: "custom", path: ["next_due_on"], message: "次回予定はメンテナンス記録にのみ設定できます" });
    }
    if (value.next_due_on !== null && value.next_due_on < value.occurred_on) {
      context.addIssue({ code: "custom", path: ["next_due_on"], message: "次回予定日は実施日以降にしてください" });
    }
    if (value.next_due_usage !== null && value.usage_reading !== null && value.next_due_usage < value.usage_reading) {
      context.addIssue({ code: "custom", path: ["next_due_usage"], message: "次回の目安は今回の使用量以上にしてください" });
    }
  });

export type ItemEventInput = z.infer<typeof ItemEventInputSchema>;

export type ItemEvent = ItemEventInput & {
  id: string;
  user_id: string;
  item_id: string;
  created_at: string;
  updated_at: string;
};

export const ITEM_EVENT_COLUMNS =
  "id,user_id,item_id,type,occurred_on,title,note,amount_yen,usage_reading,next_due_on,next_due_usage,created_at,updated_at";

type EventRow = Omit<ItemEvent, "usage_reading" | "next_due_usage"> & {
  usage_reading: number | string | null;
  next_due_usage: number | string | null;
};

/** Postgres numeric values can arrive as strings; normalize them for the client. */
export function normalizeEvent(row: EventRow): ItemEvent {
  const toNumber = (value: number | string | null) => (value === null ? null : Number(value));
  return { ...row, usage_reading: toNumber(row.usage_reading), next_due_usage: toNumber(row.next_due_usage) };
}

/** Converts a form/JSON field into a nullable number without accepting partial strings like "12abc". */
export function parseNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  if (typeof value !== "string") return Number.NaN;
  const normalized = value.replace(/[,，\s]/g, "");
  if (!normalized) return null;
  return /^\d+(\.\d+)?$/.test(normalized) ? Number(normalized) : Number.NaN;
}

function nullableString(value: unknown) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return value;
  return value.trim() ? value.trim() : null;
}

export function parseItemEventPayload(payload: Record<string, unknown>) {
  return ItemEventInputSchema.safeParse({
    type: payload.type,
    occurred_on: payload.occurred_on,
    title: payload.title,
    note: payload.note ?? "",
    amount_yen: parseNullableNumber(payload.amount_yen),
    usage_reading: parseNullableNumber(payload.usage_reading),
    next_due_on: nullableString(payload.next_due_on),
    next_due_usage: parseNullableNumber(payload.next_due_usage),
  });
}

/** Newest first; same-day events keep their creation order (newest first). */
export function sortTimeline<T extends Pick<ItemEvent, "occurred_on" | "created_at">>(events: T[]): T[] {
  return [...events].sort((a, b) => b.occurred_on.localeCompare(a.occurred_on) || b.created_at.localeCompare(a.created_at));
}

export const MAINTENANCE_DUE_SOON_DAYS = 14;

export type MaintenanceStatus = "none" | "ok" | "due_soon" | "overdue";

export type MaintenanceState = {
  status: MaintenanceStatus;
  nextDueOn: string | null;
  nextDueUsage: number | null;
  latestUsage: number | null;
  daysUntilDue: number | null;
};

function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/**
 * Derives the maintenance state of one item from its events, without any cloud service.
 * The latest maintenance record (by date, then creation) defines the next due point;
 * the highest usage reading recorded on the item is compared with the usage threshold.
 */
export function deriveMaintenanceState(
  events: Array<Pick<ItemEvent, "type" | "occurred_on" | "created_at" | "usage_reading" | "next_due_on" | "next_due_usage">>,
  today: string,
): MaintenanceState {
  const latestMaintenance = sortTimeline(events.filter((event) => event.type === "maintenance"))[0];
  const readings = events.map((event) => event.usage_reading).filter((value): value is number => value !== null);
  const latestUsage = readings.length > 0 ? Math.max(...readings) : null;

  if (!latestMaintenance || (latestMaintenance.next_due_on === null && latestMaintenance.next_due_usage === null)) {
    return { status: "none", nextDueOn: null, nextDueUsage: null, latestUsage, daysUntilDue: null };
  }

  const { next_due_on: nextDueOn, next_due_usage: nextDueUsage } = latestMaintenance;
  const daysUntilDue = nextDueOn === null ? null : daysBetween(today, nextDueOn);
  const usageReached = nextDueUsage !== null && latestUsage !== null && latestUsage >= nextDueUsage;

  let status: MaintenanceStatus = "ok";
  if ((daysUntilDue !== null && daysUntilDue < 0) || usageReached) status = "overdue";
  else if (daysUntilDue !== null && daysUntilDue <= MAINTENANCE_DUE_SOON_DAYS) status = "due_soon";

  return { status, nextDueOn, nextDueUsage, latestUsage, daysUntilDue };
}

export function todayInTokyo(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function formatYen(value: number | null) {
  return value === null ? "—" : `¥${value.toLocaleString("ja-JP")}`;
}
