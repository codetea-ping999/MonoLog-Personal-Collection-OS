"use client";

import { FormEvent, useState } from "react";
import { ExternalLink, LoaderCircle, ShoppingBag, Tag } from "lucide-react";
import { ITEM_PRIORITY_LABELS } from "@/lib/item-schema";
import { TRANSITION_DEFAULT_TITLES, formatYen, todayInTokyo, type TransitionType } from "@/lib/event-schema";
import type { CollectionItemView } from "@/lib/item-types";

const inputClass = "focus-ring mt-1.5 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm font-normal text-[var(--ink)] outline-none focus:border-[var(--forest)]";

function hostnameOf(url: string) {
  try { return new URL(url).hostname; } catch { return url; }
}

/** Wishlist details plus the purchase / sale / disposal actions for one item. */
export function ItemLifecycleActions({ item, onChanged }: { item: CollectionItemView; onChanged: () => void }) {
  const [mode, setMode] = useState<TransitionType | null>(null);
  const [occurredOn, setOccurredOn] = useState(todayInTokyo());
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const canPurchase = item.status === "wishlist";
  const canDispose = item.status === "owned" || item.status === "borrowed";
  const hasWishInfo = item.wish_price_yen !== null || item.source_url || item.priority !== null;
  if (!canPurchase && !canDispose && !hasWishInfo) return null;

  function open(next: TransitionType) {
    setMode(next); setError(""); setNote(""); setOccurredOn(todayInTokyo());
    setAmount(next === "purchase" && item.wish_price_yen !== null ? String(item.wish_price_yen) : "");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!mode) return;
    if (mode !== "purchase" && !window.confirm(`「${item.name}」を${TRANSITION_DEFAULT_TITLES[mode]}済みとして記録し、アーカイブに移しますか？`)) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/items/${item.id}/transition`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: mode, occurred_on: occurredOn, amount_yen: amount, note }),
      });
      const body = (await response.json()) as { error?: string; details?: Array<{ message: string }> };
      if (!response.ok) throw new Error(body.details?.[0]?.message || body.error || "記録できませんでした");
      setMode(null);
      onChanged();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "記録できませんでした");
    } finally { setBusy(false); }
  }

  return <section className="mt-8 rounded-[1.6rem] border border-[var(--line)] bg-white p-5 shadow-[0_15px_50px_rgba(22,66,61,0.04)] sm:p-8" aria-label="購入・売却">
    {hasWishInfo && <dl className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
      {item.wish_price_yen !== null && <div><dt className="text-[11px] font-bold text-[var(--muted)]">候補価格</dt><dd className="mt-1 font-bold text-[var(--forest)]">{formatYen(item.wish_price_yen)}</dd></div>}
      {item.priority !== null && <div><dt className="text-[11px] font-bold text-[var(--muted)]">優先度</dt><dd className="mt-1 font-bold text-[var(--forest)]">{ITEM_PRIORITY_LABELS[item.priority]}</dd></div>}
      {item.source_url && <div className="min-w-0"><dt className="text-[11px] font-bold text-[var(--muted)]">購入先・参考URL</dt><dd className="mt-1"><a href={item.source_url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex max-w-full items-center gap-1 truncate font-semibold text-[var(--forest)] underline underline-offset-2">{hostnameOf(item.source_url)} <ExternalLink size={13} /></a></dd></div>}
    </dl>}

    {(canPurchase || canDispose) && !mode && <div className={`flex flex-wrap gap-2 ${hasWishInfo ? "mt-6" : ""}`}>
      {canPurchase && <button onClick={() => open("purchase")} className="focus-ring inline-flex items-center gap-2 rounded-xl bg-[var(--coral)] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#d96d53]"><ShoppingBag size={14} /> 購入済みにする</button>}
      {canDispose && <><button onClick={() => open("sale")} className="focus-ring inline-flex items-center gap-2 rounded-xl border border-[var(--line)] px-4 py-2.5 text-xs font-bold text-[var(--forest)] hover:border-[#bdd2ca]"><Tag size={14} /> 売却を記録</button><button onClick={() => open("disposal")} className="focus-ring inline-flex items-center gap-2 rounded-xl border border-[var(--line)] px-4 py-2.5 text-xs font-bold text-[var(--muted)] hover:border-[#bdd2ca]">処分を記録</button></>}
    </div>}

    {mode && <form onSubmit={submit} className={`grid gap-4 rounded-2xl border border-[var(--line)] bg-[#fbfcf9] p-4 sm:grid-cols-2 ${hasWishInfo ? "mt-6" : ""}`}>
      <p className="text-sm font-bold text-[var(--forest)] sm:col-span-2">{mode === "purchase" ? "購入を記録して「所有中」にします。入力済みの情報はそのまま引き継ぎます。" : `${TRANSITION_DEFAULT_TITLES[mode]}を記録して「アーカイブ」に移します。`}</p>
      <label className="text-xs font-bold text-[var(--forest)]">日付<input required type="date" value={occurredOn} onChange={(event) => setOccurredOn(event.target.value)} className={inputClass} /></label>
      <label className="text-xs font-bold text-[var(--forest)]">{mode === "purchase" ? "購入金額（円）" : mode === "sale" ? "売却金額（円）" : "処分費用（円）"}<input inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="任意" className={inputClass} /></label>
      <label className="text-xs font-bold text-[var(--forest)] sm:col-span-2">メモ<input maxLength={5000} value={note} onChange={(event) => setNote(event.target.value)} placeholder={mode === "purchase" ? "例：中古、セールで購入" : "例：買取店名"} className={inputClass} /></label>
      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700 sm:col-span-2">{error}</p>}
      <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={() => setMode(null)} className="focus-ring rounded-xl px-3 py-2 text-xs font-bold text-[var(--muted)]">キャンセル</button><button disabled={busy} className="focus-ring inline-flex items-center gap-1.5 rounded-xl bg-[var(--forest)] px-4 py-2 text-xs font-bold text-white disabled:opacity-60">{busy && <LoaderCircle className="animate-spin" size={14} />} 記録する</button></div>
    </form>}
  </section>;
}
