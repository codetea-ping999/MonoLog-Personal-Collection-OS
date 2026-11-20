import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthenticatedContext, isUuid, readJsonObject, validationDetails } from "@/lib/api-utils";
import { parseItemTransitionPayload } from "@/lib/event-schema";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Records a lifecycle transition atomically:
 * purchase (wishlist → owned, keeps every entered field) or sale/disposal (owned/borrowed → archived).
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const context = await getAuthenticatedContext();
  if (!context) return apiError("ログインが必要です", 401);
  const { id } = await params;
  if (!isUuid(id)) return apiError("アイテムが見つかりません", 404);

  const payload = await readJsonObject(request);
  if (!payload) return apiError("JSONリクエストを読み取れませんでした");
  const parsed = parseItemTransitionPayload(payload);
  if (!parsed.success) return apiError("入力内容を確認してください", 400, validationDetails(parsed.error));

  const { type, occurred_on, title, amount_yen, note } = parsed.data;
  const { data: eventId, error } = await context.supabase.rpc("record_item_transition", {
    p_item_id: id,
    p_type: type,
    p_occurred_on: occurred_on,
    p_title: title,
    p_amount_yen: amount_yen,
    p_note: note,
  });
  if (error?.code === "P0002") {
    return apiError(type === "purchase" ? "「ほしいもの」のアイテムだけ購入済みにできます" : "所有中または借りもののアイテムだけ売却・処分を記録できます", 409);
  }
  if (error || !eventId) return apiError("記録できませんでした", 500);
  return NextResponse.json({ eventId }, { status: 201 });
}
