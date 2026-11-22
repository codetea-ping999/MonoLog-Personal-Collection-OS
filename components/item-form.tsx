"use client";

/* eslint-disable @next/next/no-img-element */

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, ImagePlus, LoaderCircle, Save, Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { ITEM_KIND_LABELS, ITEM_KINDS, ITEM_PRIORITIES, ITEM_PRIORITY_LABELS, ITEM_STATUS_LABELS, ITEM_STATUSES, type ItemKind, type ItemStatus, type SimilarItemCandidate } from "@/lib/item-schema";
import type { CollectionItemView } from "@/lib/item-types";
import { parseTags as parseTagList } from "@/lib/item-schema";
import { MAX_IMAGE_SIZE, ALLOWED_IMAGE_TYPES } from "@/lib/image-constants";
import { buildProposals, type ItemSuggestion, type SuggestionField } from "@/lib/ai/types";

const SUGGESTION_FIELD_LABELS: Record<SuggestionField, string> = { name: "名称", kind: "種別", tags: "タグ", note: "メモ" };

export function ItemForm({ initialItem, onSaved }: { initialItem?: CollectionItemView; onSaved?: (item: CollectionItemView) => void }) {
  const [name, setName] = useState(initialItem?.name ?? "");
  const [kind, setKind] = useState<ItemKind>(initialItem?.kind ?? "other");
  const [status, setStatus] = useState<ItemStatus>(initialItem?.status ?? "owned");
  const [tags, setTags] = useState(initialItem?.tags.join(", ") ?? "");
  const [rating, setRating] = useState(initialItem?.rating == null ? "" : String(initialItem.rating));
  const [note, setNote] = useState(initialItem?.note ?? "");
  const [wishPrice, setWishPrice] = useState(initialItem?.wish_price_yen == null ? "" : String(initialItem.wish_price_yen));
  const [sourceUrl, setSourceUrl] = useState(initialItem?.source_url ?? "");
  const [currentValue, setCurrentValue] = useState(initialItem?.current_value_yen == null ? "" : String(initialItem.current_value_yen));
  const [priority, setPriority] = useState(initialItem?.priority == null ? "" : String(initialItem.priority));
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMessage, setAiMessage] = useState("");
  const [suggestion, setSuggestion] = useState<ItemSuggestion | null>(null);
  // For each field: the exact current value the user agreed to replace (null = not accepted).
  // If the field is edited afterwards the values no longer match and the acceptance lapses.
  const [acceptedOver, setAcceptedOver] = useState<Record<SuggestionField, string | null>>({ name: null, kind: null, tags: null, note: null });
  const suggestionRequest = useRef(0);
  const [similar, setSimilar] = useState<SimilarItemCandidate[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(initialItem?.imageUrl ?? null);
  const [removeImage, setRemoveImage] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const proposals = useMemo(
    () => (suggestion ? buildProposals(suggestion, { name, kind, tags: parseTagList(tags), note }) : []),
    [suggestion, name, kind, tags, note],
  );

  function clearSuggestion() {
    suggestionRequest.current += 1; // invalidates any request still in flight
    setSuggestion(null); setAiBusy(false);
    setAcceptedOver({ name: null, kind: null, tags: null, note: null });
  }

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/ai/suggest", { cache: "no-store", signal: controller.signal })
      .then(async (response) => (response.ok ? ((await response.json()) as { enabled: boolean }).enabled : false))
      .then(setAiEnabled)
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  async function requestSuggestion() {
    if (!file) return;
    clearSuggestion();
    const requestId = suggestionRequest.current;
    setAiBusy(true); setAiMessage("");
    const body = new FormData();
    body.set("image", file);
    if (name.trim()) body.set("hint", name.trim());
    try {
      const response = await fetch("/api/ai/suggest", { method: "POST", body });
      const result = (await response.json()) as { suggestion?: ItemSuggestion; error?: string };
      // The photo was changed or removed while waiting: this answer is about a different image.
      if (requestId !== suggestionRequest.current) return;
      if (!response.ok || !result.suggestion) throw new Error(result.error || "AI提案を取得できませんでした");
      const next = buildProposals(result.suggestion, { name, kind, tags: parseTagList(tags), note });
      setSuggestion(result.suggestion);
      // Only proposals that fill an empty field start accepted; replacing input needs an explicit tick.
      setAcceptedOver({
        name: null, kind: null, tags: null, note: null,
        ...Object.fromEntries(next.filter((proposal) => !proposal.replaces).map((proposal) => [proposal.field, proposal.current])),
      });
      if (next.length === 0) setAiMessage("提案できる内容が見つかりませんでした。手入力で続けられます");
    } catch (suggestError) {
      if (requestId !== suggestionRequest.current) return;
      setAiMessage(suggestError instanceof Error ? suggestError.message : "AI提案を取得できませんでした");
    } finally {
      if (requestId === suggestionRequest.current) setAiBusy(false);
    }
  }

  function isAccepted(field: SuggestionField, current: string) {
    return acceptedOver[field] !== null && acceptedOver[field] === current;
  }

  function applyAccepted() {
    for (const proposal of proposals) {
      if (!isAccepted(proposal.field, proposal.current)) continue;
      if (proposal.field === "name") setName(proposal.proposed);
      if (proposal.field === "kind") setKind(proposal.proposed as ItemKind);
      if (proposal.field === "tags") setTags(proposal.proposed);
      if (proposal.field === "note") setNote(proposal.proposed);
    }
    clearSuggestion();
  }

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    if (!nextFile) return;
    if (!ALLOWED_IMAGE_TYPES.includes(nextFile.type as (typeof ALLOWED_IMAGE_TYPES)[number])) { setError("画像はJPEG、PNG、WebPのいずれかを選択してください"); return; }
    if (nextFile.size > MAX_IMAGE_SIZE) { setError("画像は5MB以下にしてください"); return; }
    setError(""); setFile(nextFile); setPreview(URL.createObjectURL(nextFile)); setRemoveImage(false); clearSuggestion(); setAiMessage("");
  }

  async function checkSimilar() {
    if (name.trim().length < 2) { setSimilar([]); return; }
    const params = new URLSearchParams({ name: name.trim(), kind });
    if (initialItem) params.set("excludeId", initialItem.id);
    try {
      const response = await fetch(`/api/items/similar?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) return;
      setSimilar(((await response.json()) as { items: SimilarItemCandidate[] }).items);
    } catch {
      // Advisory only: a failed check never blocks saving.
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const body = new FormData();
    body.set("name", name); body.set("kind", kind); body.set("status", status); body.set("tags", tags); body.set("rating", rating); body.set("note", note); body.set("removeImage", String(removeImage)); body.set("wish_price_yen", wishPrice); body.set("source_url", sourceUrl); body.set("priority", priority); body.set("current_value_yen", currentValue);
    if (file) body.set("image", file);
    try {
      const response = await fetch(initialItem ? `/api/items/${initialItem.id}` : "/api/items", { method: initialItem ? "PATCH" : "POST", body });
      const result = (await response.json()) as { item?: CollectionItemView; error?: string; details?: Array<{ message: string }> };
      if (!response.ok || !result.item) throw new Error(result.details?.[0]?.message || result.error || "保存できませんでした");
      if (onSaved) onSaved(result.item);
      else router.push(`/items/${result.item.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "保存できませんでした");
    } finally { setBusy(false); }
  }

  return <form onSubmit={submit} className="space-y-7"><div className="flex items-center justify-between gap-4"><Link href={initialItem ? `/items/${initialItem.id}` : "/"} className="focus-ring inline-flex items-center gap-2 text-xs font-bold text-[var(--muted)] hover:text-[var(--forest)]"><ArrowLeft size={15} /> 戻る</Link><p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--coral)]">{initialItem ? "Edit item" : "New item"}</p></div><div className="grid gap-6 rounded-[1.6rem] border border-[var(--line)] bg-white p-5 shadow-[0_15px_50px_rgba(22,66,61,0.04)] sm:p-8"><label className="block text-sm font-bold text-[var(--forest)]">名称<span className="mt-2 block"><input autoFocus required maxLength={160} value={name} onChange={(event) => setName(event.target.value)} onBlur={() => void checkSimilar()} placeholder="例：お気に入りの一冊" className="focus-ring w-full rounded-xl border border-[var(--line)] bg-[#fbfcf9] px-4 py-3 text-sm outline-none focus:border-[var(--forest)]" /></span></label>{similar.length > 0 && <div role="status" className="-mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-900"><p className="inline-flex items-center gap-1.5 font-bold"><AlertTriangle size={14} /> 似た名前のアイテムがあります（このまま保存もできます）</p><ul className="mt-1">{similar.map((item) => <li key={item.id}><Link href={`/items/${item.id}`} target="_blank" className="underline underline-offset-2">{item.name}</Link>（{ITEM_KIND_LABELS[item.kind]}・{ITEM_STATUS_LABELS[item.status]}）</li>)}</ul></div>}<div className="grid gap-5 sm:grid-cols-2"><label className="block text-sm font-bold text-[var(--forest)]">種別<select value={kind} onChange={(event) => setKind(event.target.value as ItemKind)} onBlur={() => void checkSimilar()} className="focus-ring mt-2 w-full rounded-xl border border-[var(--line)] bg-[#fbfcf9] px-4 py-3 text-sm outline-none focus:border-[var(--forest)]">{ITEM_KINDS.map((value) => <option key={value} value={value}>{ITEM_KIND_LABELS[value]}</option>)}</select></label><label className="block text-sm font-bold text-[var(--forest)]">状態<select value={status} onChange={(event) => setStatus(event.target.value as ItemStatus)} className="focus-ring mt-2 w-full rounded-xl border border-[var(--line)] bg-[#fbfcf9] px-4 py-3 text-sm outline-none focus:border-[var(--forest)]">{ITEM_STATUSES.map((value) => <option key={value} value={value}>{ITEM_STATUS_LABELS[value]}</option>)}</select></label></div><div className="grid gap-5 sm:grid-cols-2"><label className="block text-sm font-bold text-[var(--forest)]">タグ<span className="mt-2 block"><input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="お気に入り, 2026" className="focus-ring w-full rounded-xl border border-[var(--line)] bg-[#fbfcf9] px-4 py-3 text-sm outline-none focus:border-[var(--forest)]" /></span><span className="mt-1 block text-[11px] font-normal text-[var(--muted)]">カンマ区切りで入力</span></label><label className="block text-sm font-bold text-[var(--forest)]">評価<span className="mt-2 block"><select value={rating} onChange={(event) => setRating(event.target.value)} className="focus-ring w-full rounded-xl border border-[var(--line)] bg-[#fbfcf9] px-4 py-3 text-sm outline-none focus:border-[var(--forest)]"><option value="">評価なし</option>{[5, 4, 3, 2, 1, 0].map((value) => <option key={value} value={value}>{value} / 5</option>)}</select></span></label></div>{(status === "wishlist" || wishPrice || sourceUrl || priority) && <fieldset className="grid gap-5 rounded-2xl border border-dashed border-[#c5d5ce] p-4 sm:grid-cols-3"><legend className="px-1 text-xs font-bold text-[var(--muted)]">購入候補の情報（購入後も残ります）</legend><label className="block text-sm font-bold text-[var(--forest)]">候補価格（円）<input inputMode="numeric" value={wishPrice} onChange={(event) => setWishPrice(event.target.value)} placeholder="例：39800" className="focus-ring mt-2 w-full rounded-xl border border-[var(--line)] bg-[#fbfcf9] px-4 py-3 text-sm outline-none focus:border-[var(--forest)]" /></label><label className="block text-sm font-bold text-[var(--forest)]">優先度<select value={priority} onChange={(event) => setPriority(event.target.value)} className="focus-ring mt-2 w-full rounded-xl border border-[var(--line)] bg-[#fbfcf9] px-4 py-3 text-sm outline-none focus:border-[var(--forest)]"><option value="">未設定</option>{ITEM_PRIORITIES.map((value) => <option key={value} value={value}>{ITEM_PRIORITY_LABELS[value]}</option>)}</select></label><label className="block text-sm font-bold text-[var(--forest)] sm:col-span-3">購入先・参考URL<input type="url" maxLength={2000} value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://" className="focus-ring mt-2 w-full rounded-xl border border-[var(--line)] bg-[#fbfcf9] px-4 py-3 text-sm outline-none focus:border-[var(--forest)]" /></label></fieldset>}<label className="block text-sm font-bold text-[var(--forest)]">現在の評価額（円）<span className="ml-2 text-[11px] font-normal text-[var(--muted)]">任意。購入金額とは別に集計します</span><input inputMode="numeric" value={currentValue} onChange={(event) => setCurrentValue(event.target.value)} placeholder="例：120000" className="focus-ring mt-2 w-full rounded-xl border border-[var(--line)] bg-[#fbfcf9] px-4 py-3 text-sm outline-none focus:border-[var(--forest)] sm:max-w-xs" /></label><label className="block text-sm font-bold text-[var(--forest)]">メモ<span className="mt-2 block"><textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={5000} rows={6} placeholder="このアイテムについて残しておきたいこと" className="focus-ring w-full resize-y rounded-xl border border-[var(--line)] bg-[#fbfcf9] px-4 py-3 text-sm leading-6 outline-none focus:border-[var(--forest)]" /></span></label><div><p className="text-sm font-bold text-[var(--forest)]">画像<span className="ml-2 text-[11px] font-normal text-[var(--muted)]">JPEG / PNG / WebP、最大5MB</span></p><div className="mt-2 flex flex-wrap items-center gap-4"><label className="focus-ring inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-[#b8cfc5] px-4 py-3 text-xs font-bold text-[var(--forest)] transition hover:bg-[var(--mint)]"><ImagePlus size={17} /> {file ? "画像を変更" : "画像を選択"}<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={selectFile} /></label>{preview && <div className="relative h-20 w-20 overflow-hidden rounded-xl border border-[var(--line)]"><img src={preview} alt="プレビュー" className="h-full w-full object-cover" /><button type="button" aria-label="画像を削除" onClick={() => { clearSuggestion(); setPreview(null); setFile(null); setRemoveImage(Boolean(initialItem?.image_path)); }} className="focus-ring absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white"><X size={13} /></button></div>}{initialItem?.image_path && removeImage && <span className="text-xs font-semibold text-[var(--coral)]">保存時に画像を削除します</span>}{aiEnabled && file && <button type="button" onClick={() => void requestSuggestion()} disabled={aiBusy} className="focus-ring inline-flex items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-xs font-bold text-[var(--forest)] hover:border-[#bdd2ca] disabled:opacity-60">{aiBusy ? <LoaderCircle className="animate-spin" size={15} /> : <Sparkles size={15} />} 写真から候補を出す</button>}</div>{aiEnabled && file && <p className="mt-2 text-[11px] text-[var(--muted)]">押すと、この写真が設定済みのAIサービスへ送信されます。結果は候補として表示され、採用した項目だけが入力欄に反映されます。</p>}{aiMessage && <p className="mt-2 text-xs text-[var(--muted)]">{aiMessage}</p>}{proposals.length > 0 && <div role="region" aria-label="AIの候補" className="mt-4 rounded-2xl border border-[#c5d5ce] bg-[var(--mint)]/40 p-4"><p className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--forest)]"><Sparkles size={14} /> AIの候補（採用する項目を選んでください）</p><ul className="mt-3 space-y-3">{proposals.map((proposal) => <li key={proposal.field} className="rounded-xl bg-white p-3 text-xs"><label className="flex items-start gap-3"><input type="checkbox" checked={isAccepted(proposal.field, proposal.current)} onChange={(event) => setAcceptedOver((state) => ({ ...state, [proposal.field]: event.target.checked ? proposal.current : null }))} className="mt-0.5" /><span className="min-w-0 flex-1"><span className="font-bold text-[var(--forest)]">{SUGGESTION_FIELD_LABELS[proposal.field]}</span>{proposal.confidence !== null && <span className="ml-2 text-[10px] text-[var(--muted)]">確からしさ {Math.round(proposal.confidence * 100)}%</span>}<span className="mt-1 block whitespace-pre-wrap text-[var(--ink)]">{proposal.field === "kind" ? ITEM_KIND_LABELS[proposal.proposed as ItemKind] : proposal.proposed}</span>{proposal.replaces && <span className="mt-1 block text-[var(--coral)]">現在の入力「{proposal.field === "kind" ? ITEM_KIND_LABELS[proposal.current as ItemKind] : proposal.current}」を置き換えます</span>}</span></label></li>)}</ul><div className="mt-3 flex justify-end gap-2"><button type="button" onClick={clearSuggestion} className="focus-ring rounded-xl px-3 py-2 text-xs font-bold text-[var(--muted)]">すべて却下</button><button type="button" onClick={applyAccepted} className="focus-ring rounded-xl bg-[var(--forest)] px-4 py-2 text-xs font-bold text-white">選んだ項目を反映</button></div></div>}</div>{error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">{error}</p>}<div className="flex justify-end"><button disabled={busy} className="focus-ring inline-flex items-center gap-2 rounded-xl bg-[var(--forest)] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#225c54] disabled:cursor-wait disabled:opacity-60">{busy ? <LoaderCircle className="animate-spin" size={17} /> : <Save size={17} />} {initialItem ? "変更を保存" : "コレクションに追加"}</button></div></div></form>;
}
