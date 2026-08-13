import { z } from "zod";

export const ITEM_KINDS = ["book", "movie", "music", "game", "other"] as const;
export const ITEM_STATUSES = ["owned", "wishlist", "borrowed", "archived"] as const;

export const ItemKindSchema = z.enum(ITEM_KINDS);
export const ItemStatusSchema = z.enum(ITEM_STATUSES);

export const ItemInputSchema = z.object({
  name: z.string().trim().min(1, "名称を入力してください").max(160, "名称は160文字以内で入力してください"),
  kind: ItemKindSchema,
  status: ItemStatusSchema,
  tags: z.array(z.string().trim().min(1).max(40)).max(20),
  rating: z.number().int().min(0).max(5).nullable(),
  note: z.string().max(5000, "メモは5000文字以内で入力してください"),
});

export const ItemRequestSchema = ItemInputSchema.extend({
  removeImage: z.boolean().optional().default(false),
});

export const BULK_ITEM_LIMIT = 50;

export const BulkItemRequestSchema = z.object({
  names: z.array(z.string()).min(1, "少なくとも1件の名称を入力してください").max(BULK_ITEM_LIMIT, `一度に登録できるのは${BULK_ITEM_LIMIT}件までです`),
  kind: ItemKindSchema,
  status: ItemStatusSchema,
  tags: z.array(z.string().trim().min(1).max(40)).max(20),
});

export type ItemInput = z.infer<typeof ItemInputSchema>;
export type ItemKind = z.infer<typeof ItemKindSchema>;
export type ItemStatus = z.infer<typeof ItemStatusSchema>;

export const ITEM_KIND_LABELS: Record<ItemKind, string> = {
  book: "本",
  movie: "映画",
  music: "音楽",
  game: "ゲーム",
  other: "その他",
};

export const ITEM_STATUS_LABELS: Record<ItemStatus, string> = {
  owned: "所有中",
  wishlist: "ほしいもの",
  borrowed: "借りもの",
  archived: "アーカイブ",
};

export function parseTags(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  ).slice(0, 20);
}

export function parseNullableRating(value: string): number | null {
  if (!value.trim()) return null;
  const rating = Number(value);
  return Number.isInteger(rating) ? rating : null;
}

export type BulkNameParseResult = {
  names: string[];
  errors: Array<{ line: number; message: string }>;
  duplicateCount: number;
};

export function parseBulkNames(value: string): BulkNameParseResult {
  const names: string[] = [];
  const errors: Array<{ line: number; message: string }> = [];
  const seen = new Set<string>();
  let duplicateCount = 0;

  value.split(/\r?\n/).forEach((rawName, index) => {
    const name = rawName.trim();
    if (!name) return;
    if (name.length > 160) {
      errors.push({ line: index + 1, message: "名称は160文字以内で入力してください" });
      return;
    }
    if (seen.has(name)) {
      duplicateCount += 1;
      return;
    }
    seen.add(name);
    names.push(name);
  });

  if (names.length > BULK_ITEM_LIMIT) {
    errors.push({ line: 0, message: `一度に登録できるのは${BULK_ITEM_LIMIT}件までです` });
  }

  return { names, errors, duplicateCount };
}
