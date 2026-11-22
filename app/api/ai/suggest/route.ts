import { NextRequest, NextResponse } from "next/server";
import { ALLOWED_IMAGE_TYPES, apiError, getAuthenticatedContext, validateImage } from "@/lib/api-utils";
import { getSuggestionProvider } from "@/lib/ai/provider";

/** Tells the client whether AI suggestions are available, so the UI can hide the feature entirely when they are not. */
export async function GET() {
  const context = await getAuthenticatedContext();
  if (!context) return apiError("ログインが必要です", 401);
  return NextResponse.json({ enabled: getSuggestionProvider() !== null });
}

/**
 * Returns a suggestion for one photo. Nothing is saved here: the photo is sent to the configured
 * provider only for this request, and the client decides which proposed fields to keep.
 */
export async function POST(request: NextRequest) {
  const context = await getAuthenticatedContext();
  if (!context) return apiError("ログインが必要です", 401);

  const provider = getSuggestionProvider();
  if (!provider) return apiError("AI提案は設定されていません", 404);

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return apiError("画像を読み取れませんでした");
  }
  const fileEntry = formData.get("image");
  const file = fileEntry instanceof File && fileEntry.size > 0 ? fileEntry : null;
  if (!file) return apiError("画像を選択してください");
  const fileError = validateImage(file);
  if (fileError) return apiError(fileError);

  const hint = formData.get("hint");
  try {
    const result = await provider.suggest({
      image: new Uint8Array(await file.arrayBuffer()),
      mimeType: file.type as (typeof ALLOWED_IMAGE_TYPES)[number],
      hint: typeof hint === "string" && hint.trim() ? hint.trim() : undefined,
    });
    return NextResponse.json(result);
  } catch {
    return apiError("AI提案を取得できませんでした。手入力で続けられます", 502);
  }
}
