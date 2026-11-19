import { z } from "zod";

export const ITEM_KINDS = ["book", "movie", "music", "game", "other"] as const;
export const ITEM_STATUSES = ["owned", "wishlist", "borrowed", "archived"] as const;

export const ItemKindSchema = z.enum(ITEM_KINDS);
export const ItemStatusSchema = z.enum(ITEM_STATUSES);

export const ITEM_PRIORITIES = [1, 2, 3] as const;
export const ITEM_PRIORITY_LABELS: Record<(typeof ITEM_PRIORITIES)[number], string> = { 1: "高", 2: "中", 3: "低" };

export const ITEM_COLUMNS =
  "id,user_id,name,kind,status,tags,rating,note,image_path,wish_price_yen,source_url,priority,current_value_yen,created_at,updated_at";

export const SourceUrlSchema = z
  .string()
  .trim()
  .max(2000, "URLは2000文字以内で入力してください")
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }, "URLは http:// または https:// で始まる形式で入力してください");

export const ItemInputSchema = z.object({
  name: z.string().trim().min(1, "名称を入力してください").max(160, "名称は160文字以内で入力してください"),
  kind: ItemKindSchema,
  status: ItemStatusSchema,
  tags: z.array(z.string().trim().min(1).max(40)).max(20),
  rating: z.number().int().min(0).max(5).nullable(),
  note: z.string().max(5000, "メモは5000文字以内で入力してください"),
  wish_price_yen: z.number({ error: "候補価格は数値で入力してください" }).int("候補価格は円単位の整数で入力してください").min(0, "候補価格は0以上で入力してください").max(1_000_000_000_000, "候補価格が大きすぎます").nullable().default(null),
  source_url: SourceUrlSchema.nullable().default(null),
  current_value_yen: z.number({ error: "評価額は数値で入力してください" }).int("評価額は円単位の整数で入力してください").min(0, "評価額は0以上で入力してください").max(1_000_000_000_000, "評価額が大きすぎます").nullable().default(null),
  priority: z.union([z.literal(1), z.literal(2), z.literal(3)], { error: "優先度は高・中・低から選んでください" }).nullable().default(null),
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

/** NFKC + lowercase + strip whitespace and common punctuation, for advisory duplicate checks. */
export function normalizeItemName(value: string) {
  return value.normalize("NFKC").toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "");
}

export type SimilarItemCandidate = { id: string; name: string; kind: ItemKind; status: ItemStatus };

/**
 * Advisory duplicate detection: same normalized name, or one name containing the other
 * (when the shorter one has at least 3 characters). Same-kind matches are listed first.
 * Never used to block a save.
 */
export function findSimilarItems<T extends SimilarItemCandidate>(name: string, kind: ItemKind | null, candidates: T[], limit = 5): T[] {
  const target = normalizeItemName(name);
  if (target.length < 2) return [];
  return candidates
    .map((candidate) => {
      const other = normalizeItemName(candidate.name);
      if (!other) return null;
      const exact = other === target;
      const shorter = Math.min(other.length, target.length);
      const contains = shorter >= 3 && (other.includes(target) || target.includes(other));
      if (!exact && !contains) return null;
      return { candidate, score: (exact ? 2 : 1) + (kind && candidate.kind === kind ? 1 : 0) };
    })
    .filter((match): match is { candidate: T; score: number } => match !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ candidate }) => candidate);
}
