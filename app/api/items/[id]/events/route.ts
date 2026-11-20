import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthenticatedContext, isUuid, readJsonObject, validationDetails } from "@/lib/api-utils";
import { ITEM_EVENT_COLUMNS, deriveMaintenanceState, normalizeEvent, parseItemEventPayload, sortTimeline, todayInTokyo } from "@/lib/event-schema";

type RouteContext = { params: Promise<{ id: string }> };

async function getOwnedItemContext(id: string) {
  const context = await getAuthenticatedContext();
  if (!context) return { response: apiError("ログインが必要です", 401) };
  if (!isUuid(id)) return { response: apiError("アイテムが見つかりません", 404) };

  const { data: item, error } = await context.supabase
    .from("items")
    .select("id")
    .eq("id", id)
    .eq("user_id", context.userId)
    .maybeSingle();
  if (error) return { response: apiError("アイテムを取得できませんでした", 500) };
  if (!item) return { response: apiError("アイテムが見つかりません", 404) };
  return { context };
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const result = await getOwnedItemContext(id);
  if ("response" in result) return result.response;

  const { data, error } = await result.context.supabase
    .from("item_events")
    .select(ITEM_EVENT_COLUMNS)
    .eq("item_id", id)
    .eq("user_id", result.context.userId)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) return apiError("履歴を取得できませんでした", 500);

  const events = sortTimeline((data ?? []).map(normalizeEvent));
  return NextResponse.json({ events, maintenance: deriveMaintenanceState(events, todayInTokyo()) });
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const result = await getOwnedItemContext(id);
  if ("response" in result) return result.response;

  const payload = await readJsonObject(request);
  if (!payload) return apiError("JSONリクエストを読み取れませんでした");
  const parsed = parseItemEventPayload(payload);
  if (!parsed.success) return apiError("入力内容を確認してください", 400, validationDetails(parsed.error));

  const { data: event, error } = await result.context.supabase
    .from("item_events")
    .insert({ ...parsed.data, item_id: id, user_id: result.context.userId })
    .select(ITEM_EVENT_COLUMNS)
    .single();
  if (error || !event) return apiError("履歴を保存できませんでした", 500);
  return NextResponse.json({ event: normalizeEvent(event) }, { status: 201 });
}
