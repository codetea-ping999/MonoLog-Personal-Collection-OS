import { NextResponse } from "next/server";
import { apiError, getAuthenticatedContext } from "@/lib/api-utils";
import { deriveMaintenanceState, todayInTokyo, type ItemEvent } from "@/lib/event-schema";
import type { MaintenanceAlert } from "@/lib/item-types";

const EVENT_LIMIT = 5000;

/** Items whose maintenance is overdue or due soon, derived from the owner's events. */
export async function GET() {
  const context = await getAuthenticatedContext();
  if (!context) return apiError("ログインが必要です", 401);

  const { data: events, error } = await context.supabase
    .from("item_events")
    .select("item_id,type,occurred_on,created_at,usage_reading,next_due_on,next_due_usage")
    .eq("user_id", context.userId)
    .or("type.eq.maintenance,usage_reading.not.is.null")
    .order("occurred_on", { ascending: false })
    .limit(EVENT_LIMIT);
  if (error) return apiError("メンテナンス予定を取得できませんでした", 500);

  const byItem = new Map<string, Array<Pick<ItemEvent, "type" | "occurred_on" | "created_at" | "usage_reading" | "next_due_on" | "next_due_usage">>>();
  for (const event of events ?? []) {
    const list = byItem.get(event.item_id) ?? [];
    list.push({
      ...event,
      usage_reading: event.usage_reading === null ? null : Number(event.usage_reading),
      next_due_usage: event.next_due_usage === null ? null : Number(event.next_due_usage),
    });
    byItem.set(event.item_id, list);
  }

  const today = todayInTokyo();
  const pending = [...byItem.entries()]
    .map(([itemId, itemEvents]) => ({ itemId, state: deriveMaintenanceState(itemEvents, today) }))
    .filter(({ state }) => state.status === "overdue" || state.status === "due_soon");
  if (pending.length === 0) return NextResponse.json({ alerts: [] satisfies MaintenanceAlert[] });

  const { data: items, error: itemsError } = await context.supabase
    .from("items")
    .select("id,name")
    .eq("user_id", context.userId)
    .in("id", pending.map(({ itemId }) => itemId));
  if (itemsError) return apiError("メンテナンス予定を取得できませんでした", 500);

  const names = new Map((items ?? []).map((item) => [item.id, item.name]));
  const alerts: MaintenanceAlert[] = pending
    .filter(({ itemId }) => names.has(itemId))
    .map(({ itemId, state }) => ({ itemId, name: names.get(itemId) ?? "", ...state, status: state.status as MaintenanceAlert["status"] }))
    .sort((a, b) => (a.status === b.status ? (a.daysUntilDue ?? 0) - (b.daysUntilDue ?? 0) : a.status === "overdue" ? -1 : 1));
  return NextResponse.json({ alerts });
}
