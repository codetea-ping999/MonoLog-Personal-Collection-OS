import type { ItemKind, ItemStatus } from "@/lib/item-schema";

export type CollectionItemView = {
  id: string;
  user_id: string;
  name: string;
  kind: ItemKind;
  status: ItemStatus;
  tags: string[];
  rating: number | null;
  note: string;
  image_path: string | null;
  wish_price_yen: number | null;
  source_url: string | null;
  priority: 1 | 2 | 3 | null;
  imageUrl: string | null;
  created_at: string;
  updated_at: string;
};

export type ItemsResponse = {
  items: CollectionItemView[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type BulkItemsResponse = {
  count: number;
};

export type MaintenanceAlert = {
  itemId: string;
  name: string;
  status: "overdue" | "due_soon";
  nextDueOn: string | null;
  nextDueUsage: number | null;
  latestUsage: number | null;
  daysUntilDue: number | null;
};
