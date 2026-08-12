import { ItemInputSchema, ItemRequestSchema, parseNullableRating, parseTags, type ItemInput } from "@/lib/item-schema";
import { validateImage } from "@/lib/api-utils";

type ParsedItemRequest = {
  input: ItemInput;
  file: File | null;
  removeImage: boolean;
};

type ParseResult =
  | { success: true; data: ParsedItemRequest }
  | { success: false; message: string; details?: unknown };

function validationFailure(error: { issues: Array<{ path: PropertyKey[]; message: string }> }): ParseResult {
  return {
    success: false,
    message: "入力内容を確認してください",
    details: error.issues.map((issue) => ({ path: issue.path.map(String), message: issue.message })),
  };
}

export async function parseItemRequest(request: Request): Promise<ParseResult> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const fileEntry = formData.get("image");
    const file = fileEntry instanceof File && fileEntry.size > 0 ? fileEntry : null;
    const fileError = validateImage(file);
    if (fileError) return { success: false, message: fileError };

    const parsed = ItemInputSchema.safeParse({
      name: String(formData.get("name") ?? ""),
      kind: String(formData.get("kind") ?? ""),
      status: String(formData.get("status") ?? ""),
      tags: parseTags(String(formData.get("tags") ?? "")),
      rating: parseNullableRating(String(formData.get("rating") ?? "")),
      note: String(formData.get("note") ?? ""),
    });
    if (!parsed.success) return validationFailure(parsed.error);

    return {
      success: true,
      data: {
        input: parsed.data,
        file,
        removeImage: formData.get("removeImage") === "true",
      },
    };
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return { success: false, message: "JSONリクエストを読み取れませんでした" };
  }

  const parsed = ItemRequestSchema.safeParse({
    name: payload.name,
    kind: payload.kind,
    status: payload.status,
    tags: Array.isArray(payload.tags) ? payload.tags : typeof payload.tags === "string" ? parseTags(payload.tags) : payload.tags,
    rating: payload.rating === "" || payload.rating === undefined ? null : payload.rating,
    note: payload.note,
    removeImage: payload.removeImage,
  });
  if (!parsed.success) return validationFailure(parsed.error);

  const { removeImage, ...input } = parsed.data;
  return { success: true, data: { input, file: null, removeImage } };
}
