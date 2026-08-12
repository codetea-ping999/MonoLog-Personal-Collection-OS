import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthenticatedContext, removeItemImage, serializeItems, uploadItemImage } from "@/lib/api-utils";
import { parseItemRequest } from "@/lib/request-parser";

type RouteContext = { params: Promise<{ id: string }> };

async function getItem(request: NextRequest, id: string) {
  const context = await getAuthenticatedContext();
  if (!context) return { response: apiError("ログインが必要です", 401) };

  const { data: item, error } = await context.supabase
    .from("items")
    .select("id,user_id,name,kind,status,tags,rating,note,image_path,created_at,updated_at")
    .eq("id", id)
    .eq("user_id", context.userId)
    .maybeSingle();
  if (error) return { response: apiError("アイテムを取得できませんでした", 500) };
  if (!item) return { response: apiError("アイテムが見つかりません", 404) };
  return { context, item };
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const result = await getItem(request, id);
  if ("response" in result) return result.response;
  const [item] = await serializeItems(result.context.supabase, [result.item] as never[] as Parameters<typeof serializeItems>[1]);
  return NextResponse.json({ item });
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const result = await getItem(request, id);
  if ("response" in result) return result.response;

  const parsed = await parseItemRequest(request);
  if (!parsed.success) return apiError(parsed.message, 400, parsed.details);
  const { input, file, removeImage } = parsed.data;
  const oldImagePath = result.item.image_path;
  let imagePath = oldImagePath;
  let uploadedImagePath: string | null = null;

  if (file) {
    try {
      imagePath = await uploadItemImage(result.context.supabase, result.context.userId, id, file);
      uploadedImagePath = imagePath;
    } catch {
      return apiError("画像を保存できませんでした", 400);
    }
  } else if (removeImage) {
    imagePath = null;
  }

  const { data: updated, error } = await result.context.supabase
    .from("items")
    .update({ ...input, image_path: imagePath })
    .eq("id", id)
    .eq("user_id", result.context.userId)
    .select("id,user_id,name,kind,status,tags,rating,note,image_path,created_at,updated_at")
    .single();
  if (error || !updated) {
    if (uploadedImagePath) await removeItemImage(result.context.supabase, uploadedImagePath);
    return apiError("アイテムを更新できませんでした", 500);
  }

  if (oldImagePath && oldImagePath !== imagePath) await removeItemImage(result.context.supabase, oldImagePath);
  const [item] = await serializeItems(result.context.supabase, [updated] as never[] as Parameters<typeof serializeItems>[1]);
  return NextResponse.json({ item });
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const result = await getItem(request, id);
  if ("response" in result) return result.response;

  const { error } = await result.context.supabase
    .from("items")
    .delete()
    .eq("id", id)
    .eq("user_id", result.context.userId);
  if (error) return apiError("アイテムを削除できませんでした", 500);
  await removeItemImage(result.context.supabase, result.item.image_path);
  return new NextResponse(null, { status: 204 });
}
