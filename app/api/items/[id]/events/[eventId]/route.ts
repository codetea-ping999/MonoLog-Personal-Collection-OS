import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthenticatedContext, isUuid, readJsonObject, validationDetails } from "@/lib/api-utils";
import { ITEM_EVENT_COLUMNS, normalizeEvent, parseItemEventPayload } from "@/lib/event-schema";

type RouteContext = { params: Promise<{ id: string; eventId: string }> };

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const context = await getAuthenticatedContext();
  if (!context) return apiError("ログインが必要です", 401);
  const { id, eventId } = await params;
  if (!isUuid(id) || !isUuid(eventId)) return apiError("履歴が見つかりません", 404);

  const payload = await readJsonObject(request);
  if (!payload) return apiError("JSONリクエストを読み取れませんでした");
  const parsed = parseItemEventPayload(payload);
  if (!parsed.success) return apiError("入力内容を確認してください", 400, validationDetails(parsed.error));

  const { data: event, error } = await context.supabase
    .from("item_events")
    .update(parsed.data)
    .eq("id", eventId)
    .eq("item_id", id)
    .eq("user_id", context.userId)
    .select(ITEM_EVENT_COLUMNS)
    .maybeSingle();
  if (error) return apiError("履歴を更新できませんでした", 500);
  if (!event) return apiError("履歴が見つかりません", 404);
  return NextResponse.json({ event: normalizeEvent(event) });
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const context = await getAuthenticatedContext();
  if (!context) return apiError("ログインが必要です", 401);
  const { id, eventId } = await params;
  if (!isUuid(id) || !isUuid(eventId)) return apiError("履歴が見つかりません", 404);

  const { data, error } = await context.supabase
    .from("item_events")
    .delete()
    .eq("id", eventId)
    .eq("item_id", id)
    .eq("user_id", context.userId)
    .select("id");
  if (error) return apiError("履歴を削除できませんでした", 500);
  if (!data || data.length === 0) return apiError("履歴が見つかりません", 404);
  return new NextResponse(null, { status: 204 });
}
