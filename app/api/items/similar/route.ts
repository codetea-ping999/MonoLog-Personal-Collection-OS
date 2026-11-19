import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthenticatedContext, isUuid } from "@/lib/api-utils";
import { ItemKindSchema, findSimilarItems } from "@/lib/item-schema";

const CANDIDATE_LIMIT = 5000;

/** Advisory duplicate check for the item form. The result never blocks saving. */
export async function GET(request: NextRequest) {
  const context = await getAuthenticatedContext();
  if (!context) return apiError("ログインが必要です", 401);

  const params = request.nextUrl.searchParams;
  const name = (params.get("name") ?? "").slice(0, 160);
  const kindResult = ItemKindSchema.safeParse(params.get("kind"));
  const excludeId = params.get("excludeId");
  if (name.trim().length < 2) return NextResponse.json({ items: [] });

  let query = context.supabase.from("items").select("id,name,kind,status").eq("user_id", context.userId).limit(CANDIDATE_LIMIT);
  if (excludeId && isUuid(excludeId)) query = query.neq("id", excludeId);
  const { data, error } = await query;
  if (error) return apiError("似たアイテムを確認できませんでした", 500);

  return NextResponse.json({ items: findSimilarItems(name, kindResult.success ? kindResult.data : null, data ?? []) });
}
