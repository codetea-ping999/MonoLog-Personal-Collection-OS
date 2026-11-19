import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthenticatedContext } from "@/lib/api-utils";
import { ITEM_KIND_LABELS, ITEM_STATUS_LABELS, ItemKindSchema } from "@/lib/item-schema";
import { ITEM_EVENT_TYPE_LABELS } from "@/lib/event-schema";
import { toCsv } from "@/lib/csv";

const ROW_LIMIT = 50000;

function csvResponse(body: string, name: string) {
  return new NextResponse(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${name}"`,
      "cache-control": "no-store",
    },
  });
}

/** CSV export of the signed-in user's items or lifecycle events. Generated on request; nothing is sent elsewhere. */
export async function GET(request: NextRequest) {
  const context = await getAuthenticatedContext();
  if (!context) return apiError("ログインが必要です", 401);

  const params = request.nextUrl.searchParams;
  const dataset = params.get("dataset") === "events" ? "events" : "items";
  const kindParam = params.get("kind");
  const kindResult = kindParam ? ItemKindSchema.safeParse(kindParam) : null;
  if (kindResult && !kindResult.success) return apiError("種別の指定が不正です");
  const kind = kindResult?.success ? kindResult.data : null;
  const stamp = new Date().toISOString().slice(0, 10);

  let itemsQuery = context.supabase
    .from("items")
    .select("id,name,kind,status,tags,rating,note,wish_price_yen,current_value_yen,priority,source_url,created_at,updated_at")
    .eq("user_id", context.userId)
    .order("created_at", { ascending: true })
    .limit(ROW_LIMIT);
  if (kind) itemsQuery = itemsQuery.eq("kind", kind);
  const { data: items, error: itemsError } = await itemsQuery;
  if (itemsError) return apiError("エクスポートできませんでした", 500);

  if (dataset === "items") {
    const rows = (items ?? []).map((item) => [
      item.id, item.name, ITEM_KIND_LABELS[item.kind], ITEM_STATUS_LABELS[item.status], item.tags, item.rating, item.wish_price_yen,
      item.current_value_yen, item.priority, item.source_url, item.note, item.created_at, item.updated_at,
    ]);
    return csvResponse(
      toCsv(["id", "名称", "種別", "状態", "タグ", "評価", "候補価格", "評価額", "優先度", "URL", "メモ", "作成日時", "更新日時"], rows),
      `monolog-items-${stamp}.csv`,
    );
  }

  const names = new Map((items ?? []).map((item) => [item.id, item.name]));
  const { data: events, error: eventsError } = await context.supabase
    .from("item_events")
    .select("id,item_id,type,occurred_on,title,amount_yen,usage_reading,next_due_on,next_due_usage,note,created_at")
    .eq("user_id", context.userId)
    .order("occurred_on", { ascending: true })
    .limit(ROW_LIMIT);
  if (eventsError) return apiError("エクスポートできませんでした", 500);

  const rows = (events ?? [])
    .filter((event) => names.has(event.item_id))
    .map((event) => [
      event.id, event.item_id, names.get(event.item_id), ITEM_EVENT_TYPE_LABELS[event.type], event.occurred_on, event.title, event.amount_yen,
      event.usage_reading, event.next_due_on, event.next_due_usage, event.note, event.created_at,
    ]);
  return csvResponse(
    toCsv(["id", "アイテムid", "アイテム名", "種類", "日付", "タイトル", "金額", "使用量", "次回予定日", "次回の目安", "メモ", "作成日時"], rows),
    `monolog-events-${stamp}.csv`,
  );
}
