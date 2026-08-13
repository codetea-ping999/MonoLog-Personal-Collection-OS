import { NextRequest, NextResponse } from "next/server";
import { BulkItemRequestSchema, ItemKindSchema, ItemStatusSchema, parseBulkNames, parseTags } from "@/lib/item-schema";
import {
  apiError,
  escapeIlike,
  removeItemImage,
  serializeItems,
  uploadItemImage,
  getAuthenticatedContext,
} from "@/lib/api-utils";
import { parseItemRequest } from "@/lib/request-parser";

const PAGE_SIZE_DEFAULT = 24;
const PAGE_SIZE_MAX = 50;
const SORT_FIELDS = ["created_at", "updated_at", "rating"] as const;

export async function GET(request: NextRequest) {
  const context = await getAuthenticatedContext();
  if (!context) return apiError("ログインが必要です", 401);

  const searchParams = request.nextUrl.searchParams;
  const search = escapeIlike(searchParams.get("q") ?? "");
  const kind = searchParams.get("kind");
  const status = searchParams.get("status");
  const tag = searchParams.get("tag")?.trim();
  const sortCandidate = searchParams.get("sort") ?? "updated_at";
  const sort = SORT_FIELDS.includes(sortCandidate as (typeof SORT_FIELDS)[number])
    ? (sortCandidate as (typeof SORT_FIELDS)[number])
    : "updated_at";
  const direction = searchParams.get("direction") === "asc";
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(
    PAGE_SIZE_MAX,
    Math.max(1, Number.parseInt(searchParams.get("pageSize") ?? String(PAGE_SIZE_DEFAULT), 10) || PAGE_SIZE_DEFAULT),
  );

  if (kind && !ItemKindSchema.safeParse(kind).success) return apiError("種別の指定が不正です");
  if (status && !ItemStatusSchema.safeParse(status).success) return apiError("状態の指定が不正です");

  let query = context.supabase
    .from("items")
    .select("id,user_id,name,kind,status,tags,rating,note,image_path,created_at,updated_at", { count: "exact" })
    .eq("user_id", context.userId);

  if (search) query = query.or(`name.ilike.%${search}%,note.ilike.%${search}%`);
  if (kind) query = query.eq("kind", kind as "book" | "movie" | "music" | "game" | "other");
  if (status) query = query.eq("status", status as "owned" | "wishlist" | "borrowed" | "archived");
  if (tag) query = query.contains("tags", [tag]);

  const from = (page - 1) * pageSize;
  const { data, error, count } = await query.order(sort, { ascending: direction, nullsFirst: false }).range(from, from + pageSize - 1);
  if (error) return apiError("コレクションを取得できませんでした", 500);

  const items = await serializeItems(context.supabase, (data ?? []) as never[] as Parameters<typeof serializeItems>[1]);
  return NextResponse.json({ items, page, pageSize, total: count ?? 0, totalPages: Math.ceil((count ?? 0) / pageSize) });
}

export async function POST(request: NextRequest) {
  const context = await getAuthenticatedContext();
  if (!context) return apiError("ログインが必要です", 401);

  const parsed = await parseItemRequest(request);
  if (!parsed.success) return apiError(parsed.message, 400, parsed.details);

  const { input, file } = parsed.data;
  const { data: item, error } = await context.supabase
    .from("items")
    .insert({ user_id: context.userId, ...input })
    .select("id,user_id,name,kind,status,tags,rating,note,image_path,created_at,updated_at")
    .single();
  if (error || !item) return apiError("アイテムを登録できませんでした", 500);

  let savedItem = item;
  let uploadedImagePath: string | null = null;
  if (file) {
    try {
      const imagePath = await uploadItemImage(context.supabase, context.userId, item.id, file);
      uploadedImagePath = imagePath;
      const { data: updated, error: updateError } = await context.supabase
        .from("items")
        .update({ image_path: imagePath })
        .eq("id", item.id)
        .select("id,user_id,name,kind,status,tags,rating,note,image_path,created_at,updated_at")
        .single();
      if (updateError || !updated) throw updateError ?? new Error("画像パスを保存できませんでした");
      savedItem = updated;
    } catch {
      await removeItemImage(context.supabase, uploadedImagePath);
      await context.supabase.from("items").delete().eq("id", item.id);
      return apiError("画像を保存できなかったため、登録を取り消しました", 400);
    }
  }

  const [serialized] = await serializeItems(context.supabase, [savedItem] as never[] as Parameters<typeof serializeItems>[1]);
  return NextResponse.json({ item: serialized }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const context = await getAuthenticatedContext();
  if (!context) return apiError("ログインが必要です", 401);

  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return apiError("JSONリクエストを読み取れませんでした");
  }

  const parsedNames = parseBulkNames(Array.isArray(payload.names) ? payload.names.join("\n") : "");
  if (parsedNames.errors.length > 0) return apiError("入力内容を確認してください", 400, parsedNames.errors);

  const parsed = BulkItemRequestSchema.safeParse({
    names: parsedNames.names,
    kind: payload.kind,
    status: payload.status,
    tags: Array.isArray(payload.tags) ? payload.tags : typeof payload.tags === "string" ? parseTags(payload.tags) : payload.tags,
  });
  if (!parsed.success) {
    return apiError("入力内容を確認してください", 400, parsed.error.issues.map((issue) => ({ path: issue.path.map(String), message: issue.message })));
  }

  const { names, kind, status, tags } = parsed.data;
  const { error } = await context.supabase.from("items").insert(
    names.map((name) => ({ user_id: context.userId, name, kind, status, tags, rating: null, note: "" })),
  );
  if (error) return apiError("アイテムを一括登録できませんでした", 500);
  return NextResponse.json({ count: names.length }, { status: 201 });
}
