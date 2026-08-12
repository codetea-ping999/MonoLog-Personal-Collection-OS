"use client";

/* eslint-disable @next/next/no-img-element */

import { ChangeEvent, FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ImagePlus, LoaderCircle, Save, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { ITEM_KIND_LABELS, ITEM_KINDS, ITEM_STATUS_LABELS, ITEM_STATUSES, type ItemKind, type ItemStatus } from "@/lib/item-schema";
import type { CollectionItemView } from "@/lib/item-types";
import { MAX_IMAGE_SIZE, ALLOWED_IMAGE_TYPES } from "@/lib/image-constants";

export function ItemForm({ initialItem, onSaved }: { initialItem?: CollectionItemView; onSaved?: (item: CollectionItemView) => void }) {
  const [name, setName] = useState(initialItem?.name ?? "");
  const [kind, setKind] = useState<ItemKind>(initialItem?.kind ?? "other");
  const [status, setStatus] = useState<ItemStatus>(initialItem?.status ?? "owned");
  const [tags, setTags] = useState(initialItem?.tags.join(", ") ?? "");
  const [rating, setRating] = useState(initialItem?.rating == null ? "" : String(initialItem.rating));
  const [note, setNote] = useState(initialItem?.note ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(initialItem?.imageUrl ?? null);
  const [removeImage, setRemoveImage] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    if (!nextFile) return;
    if (!ALLOWED_IMAGE_TYPES.includes(nextFile.type as (typeof ALLOWED_IMAGE_TYPES)[number])) { setError("画像はJPEG、PNG、WebPのいずれかを選択してください"); return; }
    if (nextFile.size > MAX_IMAGE_SIZE) { setError("画像は5MB以下にしてください"); return; }
    setError(""); setFile(nextFile); setPreview(URL.createObjectURL(nextFile)); setRemoveImage(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const body = new FormData();
    body.set("name", name); body.set("kind", kind); body.set("status", status); body.set("tags", tags); body.set("rating", rating); body.set("note", note); body.set("removeImage", String(removeImage));
    if (file) body.set("image", file);
    try {
      const response = await fetch(initialItem ? `/api/items/${initialItem.id}` : "/api/items", { method: initialItem ? "PATCH" : "POST", body });
      const result = (await response.json()) as { item?: CollectionItemView; error?: string };
      if (!response.ok || !result.item) throw new Error(result.error || "保存できませんでした");
      if (onSaved) onSaved(result.item);
      else router.push(`/items/${result.item.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "保存できませんでした");
    } finally { setBusy(false); }
  }

  return <form onSubmit={submit} className="space-y-7"><div className="flex items-center justify-between gap-4"><Link href={initialItem ? `/items/${initialItem.id}` : "/"} className="focus-ring inline-flex items-center gap-2 text-xs font-bold text-[var(--muted)] hover:text-[var(--forest)]"><ArrowLeft size={15} /> 戻る</Link><p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--coral)]">{initialItem ? "Edit item" : "New item"}</p></div><div className="grid gap-6 rounded-[1.6rem] border border-[var(--line)] bg-white p-5 shadow-[0_15px_50px_rgba(22,66,61,0.04)] sm:p-8"><label className="block text-sm font-bold text-[var(--forest)]">名称<span className="mt-2 block"><input autoFocus required maxLength={160} value={name} onChange={(event) => setName(event.target.value)} placeholder="例：お気に入りの一冊" className="focus-ring w-full rounded-xl border border-[var(--line)] bg-[#fbfcf9] px-4 py-3 text-sm outline-none focus:border-[var(--forest)]" /></span></label><div className="grid gap-5 sm:grid-cols-2"><label className="block text-sm font-bold text-[var(--forest)]">種別<select value={kind} onChange={(event) => setKind(event.target.value as ItemKind)} className="focus-ring mt-2 w-full rounded-xl border border-[var(--line)] bg-[#fbfcf9] px-4 py-3 text-sm outline-none focus:border-[var(--forest)]">{ITEM_KINDS.map((value) => <option key={value} value={value}>{ITEM_KIND_LABELS[value]}</option>)}</select></label><label className="block text-sm font-bold text-[var(--forest)]">状態<select value={status} onChange={(event) => setStatus(event.target.value as ItemStatus)} className="focus-ring mt-2 w-full rounded-xl border border-[var(--line)] bg-[#fbfcf9] px-4 py-3 text-sm outline-none focus:border-[var(--forest)]">{ITEM_STATUSES.map((value) => <option key={value} value={value}>{ITEM_STATUS_LABELS[value]}</option>)}</select></label></div><div className="grid gap-5 sm:grid-cols-2"><label className="block text-sm font-bold text-[var(--forest)]">タグ<span className="mt-2 block"><input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="お気に入り, 2026" className="focus-ring w-full rounded-xl border border-[var(--line)] bg-[#fbfcf9] px-4 py-3 text-sm outline-none focus:border-[var(--forest)]" /></span><span className="mt-1 block text-[11px] font-normal text-[var(--muted)]">カンマ区切りで入力</span></label><label className="block text-sm font-bold text-[var(--forest)]">評価<span className="mt-2 block"><select value={rating} onChange={(event) => setRating(event.target.value)} className="focus-ring w-full rounded-xl border border-[var(--line)] bg-[#fbfcf9] px-4 py-3 text-sm outline-none focus:border-[var(--forest)]"><option value="">評価なし</option>{[5, 4, 3, 2, 1, 0].map((value) => <option key={value} value={value}>{value} / 5</option>)}</select></span></label></div><label className="block text-sm font-bold text-[var(--forest)]">メモ<span className="mt-2 block"><textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={5000} rows={6} placeholder="このアイテムについて残しておきたいこと" className="focus-ring w-full resize-y rounded-xl border border-[var(--line)] bg-[#fbfcf9] px-4 py-3 text-sm leading-6 outline-none focus:border-[var(--forest)]" /></span></label><div><p className="text-sm font-bold text-[var(--forest)]">画像<span className="ml-2 text-[11px] font-normal text-[var(--muted)]">JPEG / PNG / WebP、最大5MB</span></p><div className="mt-2 flex flex-wrap items-center gap-4"><label className="focus-ring inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-[#b8cfc5] px-4 py-3 text-xs font-bold text-[var(--forest)] transition hover:bg-[var(--mint)]"><ImagePlus size={17} /> {file ? "画像を変更" : "画像を選択"}<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={selectFile} /></label>{preview && <div className="relative h-20 w-20 overflow-hidden rounded-xl border border-[var(--line)]"><img src={preview} alt="プレビュー" className="h-full w-full object-cover" /><button type="button" aria-label="画像を削除" onClick={() => { setPreview(null); setFile(null); setRemoveImage(Boolean(initialItem?.image_path)); }} className="focus-ring absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white"><X size={13} /></button></div>}{initialItem?.image_path && removeImage && <span className="text-xs font-semibold text-[var(--coral)]">保存時に画像を削除します</span>}</div></div>{error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">{error}</p>}<div className="flex justify-end"><button disabled={busy} className="focus-ring inline-flex items-center gap-2 rounded-xl bg-[var(--forest)] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#225c54] disabled:cursor-wait disabled:opacity-60">{busy ? <LoaderCircle className="animate-spin" size={17} /> : <Save size={17} />} {initialItem ? "変更を保存" : "コレクションに追加"}</button></div></div></form>;
}
