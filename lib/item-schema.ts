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
