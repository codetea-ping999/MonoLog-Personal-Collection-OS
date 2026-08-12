import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ALLOWED_IMAGE_TYPES, IMAGE_BUCKET, MAX_IMAGE_SIZE } from "@/lib/image-constants";

export { ALLOWED_IMAGE_TYPES, IMAGE_BUCKET, MAX_IMAGE_SIZE };

export function apiError(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ error: message, ...(details ? { details } : {}) }, { status });
}

export async function getAuthenticatedContext() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;

  if (error || !userId) return null;
  return { supabase, userId };
}

export type CollectionItem = {
  id: string;
  user_id: string;
  name: string;
  kind: "book" | "movie" | "music" | "game" | "other";
  status: "owned" | "wishlist" | "borrowed" | "archived";
  tags: string[];
  rating: number | null;
  note: string;
  image_path: string | null;
  created_at: string;
  updated_at: string;
};

export type ApiItem = CollectionItem & { imageUrl: string | null };

export async function serializeItems(
  supabase: Awaited<ReturnType<typeof createClient>>,
  items: CollectionItem[],
): Promise<ApiItem[]> {
  return Promise.all(
    items.map(async (item) => {
      if (!item.image_path) return { ...item, imageUrl: null };
      const { data } = await supabase.storage.from(IMAGE_BUCKET).createSignedUrl(item.image_path, 60 * 60);
      return { ...item, imageUrl: data?.signedUrl ?? null };
    }),
  );
}

export function validateImage(file: File | null) {
  if (!file || file.size === 0) return null;
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    return "画像はJPEG、PNG、WebPのいずれかを選択してください";
  }
  if (file.size > MAX_IMAGE_SIZE) return "画像は5MB以下にしてください";
  return null;
}

export function getImageExtension(file: File) {
  const extensionByType: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  return extensionByType[file.type] ?? "bin";
}

export async function uploadItemImage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  itemId: string,
  file: File,
) {
  const path = `${userId}/${itemId}.${getImageExtension(file)}`;
  const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: true,
  });
  if (error) throw error;
  return path;
}

export async function removeItemImage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  imagePath: string | null,
) {
  if (!imagePath) return;
  await supabase.storage.from(IMAGE_BUCKET).remove([imagePath]);
}

export function escapeIlike(value: string) {
  return value.replace(/[\\%_(),*]/g, " ").trim();
}
