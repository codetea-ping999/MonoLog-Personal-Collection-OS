import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthenticatedContext } from "@/lib/api-utils";
import { ItemKindSchema } from "@/lib/item-schema";
import { computeAnalytics, type AnalyticsEvent, type AnalyticsItem } from "@/lib/analytics";

const ROW_LIMIT = 20000;

export async function GET(request: NextRequest) {
  const context = await getAuthenticatedContext();
  if (!context) return apiError("ログインが必要です", 401);

  const params = request.nextUrl.searchParams;
  const granularity = params.get("granularity") === "year" ? "year" : "month";
  const kindParam = params.get("kind");
  const kindResult = kindParam ? ItemKindSchema.safeParse(kindParam) : null;
  if (kindResult && !kindResult.success) return apiError("種別の指定が不正です");

  const [itemsResult, eventsResult] = await Promise.all([
    context.supabase.from("items").select("id,kind,status,created_at,current_value_yen").eq("user_id", context.userId).limit(ROW_LIMIT),
    context.supabase
      .from("item_events")
      .select("item_id,type,occurred_on,amount_yen")
      .eq("user_id", context.userId)
      .in("type", ["purchase", "sale", "maintenance", "modification", "disposal"])
      .limit(ROW_LIMIT),
  ]);
  if (itemsResult.error || eventsResult.error) return apiError("分析データを取得できませんでした", 500);

  const summary = computeAnalytics((itemsResult.data ?? []) as AnalyticsItem[], (eventsResult.data ?? []) as AnalyticsEvent[], {
    granularity,
    kind: kindResult?.success ? kindResult.data : null,
  });
  return NextResponse.json({ summary, granularity, truncated: (itemsResult.data?.length ?? 0) >= ROW_LIMIT || (eventsResult.data?.length ?? 0) >= ROW_LIMIT });
}
