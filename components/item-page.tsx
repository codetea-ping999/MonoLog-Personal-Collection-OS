"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Archive, CalendarDays, Edit3, LoaderCircle, Tag, Trash2 } from "lucide-react";
import { ITEM_KIND_LABELS, ITEM_STATUS_LABELS } from "@/lib/item-schema";
import type { CollectionItemView } from "@/lib/item-types";
import { ItemForm } from "@/components/item-form";

export function ItemPage({ id }: { id: string }) {
  const [item, setItem] = useState<CollectionItemView | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/items/${id}`, { signal: controller.signal, cache: "no-store" });
        const result = (await response.json()) as { item?: CollectionItemView; error?: string };
        if (!response.ok || !result.item) throw new Error(result.error || "アイテムが見つかりません");
        setItem(result.item);
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setError(loadError instanceof Error ? loadError.message : "読み込みに失敗しました");
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, [id]);

  async function deleteItem() {
    if (!item || !window.confirm(`「${item.name}」を削除しますか？`)) return;
    setDeleting(true); setError("");
    const response = await fetch(`/api/items/${item.id}`, { method: "DELETE" });
    if (!response.ok) { const result = (await response.json()) as { error?: string }; setError(result.error || "削除できませんでした"); setDeleting(false); return; }
    router.push("/");
  }

  if (loading) return <main className="grid min-h-screen place-items-center"><LoaderCircle className="animate-spin text-[var(--muted)]" size={24} /></main>;
  if (error || !item) return <main className="mx-auto max-w-xl px-5 py-12"><Link href="/" className="inline-flex items-center gap-2 text-xs font-bold text-[var(--muted)]"><ArrowLeft size={15} /> 一覧へ戻る</Link><div className="mt-8 rounded-2xl bg-red-50 px-5 py-6 text-sm text-red-700">{error || "アイテムが見つかりません"}</div></main>;
  if (editing) return <main className="min-h-screen px-5 py-8 sm:px-8"><div className="mx-auto max-w-3xl"><ItemForm initialItem={item} onSaved={(savedItem) => { setItem(savedItem); setEditing(false); }} /></div></main>;

  return <main className="min-h-screen px-5 py-8 sm:px-8 lg:px-12"><div className="mx-auto max-w-5xl"><div className="flex items-center justify-between"><Link href="/" className="focus-ring inline-flex items-center gap-2 text-xs font-bold text-[var(--muted)] hover:text-[var(--forest)]"><ArrowLeft size={15} /> 一覧へ戻る</Link><div className="flex gap-2"><button onClick={() => setEditing(true)} className="focus-ring inline-flex items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-xs font-bold text-[var(--forest)] hover:border-[#bdd2ca]"><Edit3 size={14} /> 編集</button><button disabled={deleting} onClick={deleteItem} className="focus-ring inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-[var(--coral)] hover:bg-red-50"><Trash2 size={14} /> 削除</button></div></div><div className="mt-8 overflow-hidden rounded-[1.8rem] border border-[var(--line)] bg-white shadow-[0_20px_70px_rgba(22,66,61,0.07)]"><div className="grid lg:grid-cols-[0.85fr_1.15fr]"><div className="relative min-h-[310px] bg-[#edf3ef] lg:min-h-[520px]">{item.imageUrl ? <img src={item.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <div className="grid h-full min-h-[310px] place-items-center text-[var(--muted)]"><Archive size={60} strokeWidth={1} /></div>}</div><article className="p-7 sm:p-12"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[var(--mint)] px-3 py-1.5 text-xs font-bold text-[var(--forest)]">{ITEM_KIND_LABELS[item.kind]}</span><span className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs font-bold text-[var(--muted)]">{ITEM_STATUS_LABELS[item.status]}</span></div><h1 className="mt-7 text-3xl font-semibold leading-tight tracking-[-0.05em] text-[var(--forest)] sm:text-5xl">{item.name}</h1><div className="mt-7 flex items-center gap-3"><span className="text-2xl tracking-[0.1em] text-[#d6a34b]">{item.rating === null ? "☆ ☆ ☆ ☆ ☆" : `${"★".repeat(item.rating)}${"☆".repeat(5 - item.rating)}`}</span><span className="text-xs font-semibold text-[var(--muted)]">{item.rating === null ? "未評価" : `${item.rating} / 5`}</span></div>{item.note && <div className="mt-9 border-l-2 border-[var(--mint)] pl-5 text-sm leading-8 text-[var(--muted)]"><p className="whitespace-pre-wrap">{item.note}</p></div>}<div className="mt-10 flex flex-wrap gap-2">{item.tags.map((tag) => <span key={tag} className="inline-flex items-center gap-1 rounded-lg bg-[#f3f6f3] px-3 py-2 text-xs font-semibold text-[var(--muted)]"><Tag size={13} /> {tag}</span>)}</div><div className="mt-12 flex items-center gap-2 border-t border-[var(--line)] pt-5 text-[11px] font-semibold text-[var(--muted)]"><CalendarDays size={14} /> 更新：{new Date(item.updated_at).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })}</div></article></div></div></div></main>;
}
