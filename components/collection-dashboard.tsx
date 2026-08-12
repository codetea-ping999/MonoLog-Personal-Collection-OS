"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useEffect, useState } from "react";
import { Archive, ArrowDownUp, ChevronLeft, ChevronRight, CirclePlus, Filter, LoaderCircle, PackageOpen, Search, SlidersHorizontal, X } from "lucide-react";
import { ITEM_KIND_LABELS, ITEM_STATUS_LABELS, ITEM_KINDS, ITEM_STATUSES, type ItemKind, type ItemStatus } from "@/lib/item-schema";
import type { CollectionItemView, ItemsResponse } from "@/lib/item-types";
import { SignOutButton } from "@/components/sign-out-button";

type SortField = "created_at" | "updated_at" | "rating";

function Stars({ rating }: { rating: number | null }) {
  return <span className="tracking-[0.1em] text-sm text-[#d6a34b]" aria-label={rating === null ? "評価なし" : `${rating}点`}>{rating === null ? "—" : `${"★".repeat(rating)}${"☆".repeat(5 - rating)}`}</span>;
}

function ItemCard({ item }: { item: CollectionItemView }) {
  return <Link href={`/items/${item.id}`} className="focus-ring group overflow-hidden rounded-[1.35rem] border border-[var(--line)] bg-white transition duration-300 hover:-translate-y-1 hover:border-[#bdd2ca] hover:shadow-[0_18px_40px_rgba(22,66,61,0.1)]"><div className="relative aspect-[1.35/1] overflow-hidden bg-[#edf3ef]">{item.imageUrl ? <img src={item.imageUrl} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="grid h-full place-items-center text-[var(--muted)]"><Archive size={31} strokeWidth={1.2} /></div>}<span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold tracking-wide text-[var(--forest)] shadow-sm">{ITEM_KIND_LABELS[item.kind]}</span></div><div className="p-4"><div className="flex items-start justify-between gap-3"><h3 className="line-clamp-2 text-[15px] font-bold leading-6 text-[var(--forest)]">{item.name}</h3><Stars rating={item.rating} /></div><div className="mt-3 flex flex-wrap items-center gap-1.5">{item.tags.slice(0, 3).map((tag) => <span key={tag} className="rounded-md bg-[#f3f6f3] px-2 py-1 text-[10px] font-semibold text-[var(--muted)]">#{tag}</span>)}<span className="ml-auto text-[10px] font-semibold text-[var(--muted)]">{ITEM_STATUS_LABELS[item.status]}</span></div></div></Link>;
}

export function CollectionDashboard({ userEmail }: { userEmail: string }) {
  const [items, setItems] = useState<CollectionItemView[]>([]);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<"" | ItemKind>("");
  const [status, setStatus] = useState<"" | ItemStatus>("");
  const [tag, setTag] = useState("");
  const [sort, setSort] = useState<SortField>("updated_at");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [responseMeta, setResponseMeta] = useState({ total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    async function loadItems() {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({ page: String(page), sort, direction });
      if (q.trim()) params.set("q", q.trim());
      if (kind) params.set("kind", kind);
      if (status) params.set("status", status);
      if (tag.trim()) params.set("tag", tag.trim());
      try {
        const result = await fetch(`/api/items?${params.toString()}`, { signal: controller.signal, cache: "no-store" });
        const body = (await result.json()) as ItemsResponse & { error?: string };
        if (!result.ok) throw new Error(body.error || "読み込みに失敗しました");
        setItems(body.items);
        setResponseMeta({ total: body.total, totalPages: body.totalPages });
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setError(loadError instanceof Error ? loadError.message : "読み込みに失敗しました");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadItems();
    return () => controller.abort();
  }, [direction, kind, page, q, sort, status, tag]);

  function resetFilters() {
    setQ(""); setKind(""); setStatus(""); setTag(""); setPage(1);
  }

  const hasFilters = Boolean(q || kind || status || tag);

  return <main className="min-h-screen px-5 py-6 sm:px-8 lg:px-12"><div className="mx-auto max-w-[1440px]"><header className="flex items-center justify-between gap-4"><Link href="/" className="focus-ring flex items-center gap-3 text-sm font-black tracking-[0.18em] text-[var(--forest)]"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-[var(--forest)] text-[var(--mint)]"><PackageOpen size={19} /></span><span className="hidden sm:inline">MONOLOG</span></Link><div className="flex items-center gap-2"><span className="hidden text-xs text-[var(--muted)] sm:inline">{userEmail}</span><SignOutButton /></div></header>

<section className="pb-7 pt-16 sm:pb-9 sm:pt-24"><div className="flex flex-col justify-between gap-7 lg:flex-row lg:items-end"><div><p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[var(--coral)]">Your personal archive</p><h1 className="text-4xl font-semibold tracking-[-0.06em] text-[var(--forest)] sm:text-6xl">集めたものを、<br className="sm:hidden" />見つけやすく。</h1><p className="mt-5 max-w-xl text-sm leading-7 text-[var(--muted)]">あなたのコレクションを、あなたのペースで。記録して、眺めて、また出会う。</p></div><Link href="/items/new" className="focus-ring inline-flex w-fit items-center gap-2 rounded-2xl bg-[var(--coral)] px-5 py-3.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(230,122,96,0.24)] transition hover:-translate-y-0.5 hover:bg-[#d96d53]"><CirclePlus size={18} /> アイテムを追加</Link></div></section>

<section className="rounded-[1.6rem] border border-[var(--line)] bg-white/75 p-3 shadow-[0_15px_50px_rgba(22,66,61,0.04)] sm:p-4"><div className="flex flex-col gap-3 lg:flex-row"><label className="relative min-w-0 flex-1"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={18} /><input value={q} onChange={(event) => { setQ(event.target.value); setPage(1); }} placeholder="名称やメモから探す" className="focus-ring w-full rounded-xl border border-transparent bg-[#f4f7f3] py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[#bdd2ca] focus:bg-white" /></label><div className="flex gap-2"><button onClick={() => setShowFilters(!showFilters)} className={`focus-ring inline-flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-xs font-bold transition sm:flex-none ${showFilters || hasFilters ? "border-[var(--forest)] bg-[var(--mint)] text-[var(--forest)]" : "border-[var(--line)] text-[var(--muted)] hover:border-[#bdd2ca]"}`}><SlidersHorizontal size={16} /> 絞り込み {hasFilters && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[var(--forest)] px-1 text-[10px] text-white">{[q, kind, status, tag].filter(Boolean).length}</span>}</button><label className="relative"><ArrowDownUp className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={15} /><select value={`${sort}:${direction}`} onChange={(event) => { const [nextSort, nextDirection] = event.target.value.split(":") as [SortField, "asc" | "desc"]; setSort(nextSort); setDirection(nextDirection); setPage(1); }} className="focus-ring h-full appearance-none rounded-xl border border-[var(--line)] bg-white py-3 pl-9 pr-8 text-xs font-bold text-[var(--muted)] outline-none"><option value="updated_at:desc">更新が新しい順</option><option value="created_at:desc">追加が新しい順</option><option value="rating:desc">評価が高い順</option><option value="name:asc" disabled>名称順（準備中）</option></select></label></div></div>{showFilters && <div className="mt-3 grid gap-3 border-t border-[var(--line)] pt-3 sm:grid-cols-3"><label className="text-xs font-bold text-[var(--muted)]">種別<select value={kind} onChange={(event) => { setKind(event.target.value as "" | ItemKind); setPage(1); }} className="focus-ring mt-2 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm font-semibold text-[var(--ink)] outline-none"><option value="">すべて</option>{ITEM_KINDS.map((value) => <option key={value} value={value}>{ITEM_KIND_LABELS[value]}</option>)}</select></label><label className="text-xs font-bold text-[var(--muted)]">状態<select value={status} onChange={(event) => { setStatus(event.target.value as "" | ItemStatus); setPage(1); }} className="focus-ring mt-2 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm font-semibold text-[var(--ink)] outline-none"><option value="">すべて</option>{ITEM_STATUSES.map((value) => <option key={value} value={value}>{ITEM_STATUS_LABELS[value]}</option>)}</select></label><label className="text-xs font-bold text-[var(--muted)]">タグ<input value={tag} onChange={(event) => { setTag(event.target.value); setPage(1); }} placeholder="例：お気に入り" className="focus-ring mt-2 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none" /></label>{hasFilters && <button onClick={resetFilters} className="focus-ring inline-flex w-fit items-center gap-1 text-xs font-bold text-[var(--coral)] sm:col-span-3"><X size={14} /> 絞り込みをリセット</button>}</div>}</section>

<div className="mb-5 mt-9 flex items-center justify-between"><p className="text-sm font-bold text-[var(--forest)]"><span className="text-2xl tracking-[-0.05em]">{responseMeta.total}</span><span className="ml-2 text-xs font-semibold text-[var(--muted)]">items in your archive</span></p>{hasFilters && <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--muted)]"><Filter size={13} /> 絞り込み中</span>}</div>

{error ? <div className="rounded-[1.4rem] border border-red-100 bg-red-50 px-5 py-6 text-sm text-red-700">{error}</div> : loading ? <div className="grid place-items-center rounded-[1.4rem] border border-[var(--line)] bg-white/60 py-24 text-[var(--muted)]"><LoaderCircle className="animate-spin" size={24} /></div> : items.length === 0 ? <div className="grid place-items-center rounded-[1.4rem] border border-dashed border-[#c5d5ce] bg-white/60 px-6 py-24 text-center"><span className="mb-5 grid h-16 w-16 place-items-center rounded-3xl bg-[var(--mint)] text-[var(--forest)]"><PackageOpen size={28} strokeWidth={1.5} /></span><h2 className="text-lg font-bold text-[var(--forest)]">{hasFilters ? "見つかりませんでした" : "最初のアイテムを追加しましょう"}</h2><p className="mt-2 max-w-sm text-sm leading-6 text-[var(--muted)]">{hasFilters ? "検索語や絞り込み条件を変えて、もう一度試してみてください。" : "本、映画、音楽、ゲーム。あなたの好きなものを記録できます。"}</p>{hasFilters ? <button onClick={resetFilters} className="focus-ring mt-6 rounded-xl bg-[var(--forest)] px-4 py-2.5 text-xs font-bold text-white">条件をリセット</button> : <Link href="/items/new" className="focus-ring mt-6 rounded-xl bg-[var(--forest)] px-4 py-2.5 text-xs font-bold text-white">アイテムを追加する</Link>}</div> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{items.map((item) => <ItemCard key={item.id} item={item} />)}</div>}

{responseMeta.totalPages > 1 && <nav className="mt-9 flex items-center justify-center gap-4" aria-label="ページナビゲーション"><button disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="focus-ring grid h-10 w-10 place-items-center rounded-xl border border-[var(--line)] bg-white text-[var(--muted)] disabled:opacity-30"><ChevronLeft size={17} /></button><span className="text-xs font-bold text-[var(--muted)]">{page} <span className="mx-1 font-normal">/</span> {responseMeta.totalPages}</span><button disabled={page >= responseMeta.totalPages} onClick={() => setPage((current) => current + 1)} className="focus-ring grid h-10 w-10 place-items-center rounded-xl border border-[var(--line)] bg-white text-[var(--muted)] disabled:opacity-30"><ChevronRight size={17} /></button></nav>}
</div></main>;
}
