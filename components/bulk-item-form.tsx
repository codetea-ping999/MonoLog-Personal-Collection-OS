"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { ArrowLeft, LoaderCircle, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { BULK_ITEM_LIMIT, ITEM_KIND_LABELS, ITEM_KINDS, ITEM_STATUS_LABELS, ITEM_STATUSES, parseBulkNames, parseTags, type ItemKind, type ItemStatus } from "@/lib/item-schema";
import type { BulkItemsResponse } from "@/lib/item-types";

export function BulkItemForm() {
  const [rawNames, setRawNames] = useState("");
  const [kind, setKind] = useState<ItemKind>("other");
  const [status, setStatus] = useState<ItemStatus>("owned");
  const [tags, setTags] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();
  const preview = useMemo(() => parseBulkNames(rawNames), [rawNames]);
  const canSubmit = preview.names.length > 0 && preview.errors.length === 0 && !busy;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setBusy(true); setError(""); setSuccess("");
    try {
      const response = await fetch("/api/items", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ names: preview.names, kind, status, tags: parseTags(tags) }) });
      const result = (await response.json()) as BulkItemsResponse & { error?: string };
      if (!response.ok) throw new Error(result.error || "一括登録できませんでした");
      setSuccess(`${result.count}件をコレクションに追加しました。一覧へ移動します。`);
      window.setTimeout(() => { router.push("/"); router.refresh(); }, 900);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "一括登録できませんでした");
    } finally { setBusy(false); }
  }

  return <form onSubmit={submit} className="space-y-7"><div className="flex items-center justify-between gap-4"><Link href="/" className="focus-ring inline-flex items-center gap-2 text-xs font-bold text-[var(--muted)] hover:text-[var(--forest)]"><ArrowLeft size={15} /> 一覧へ戻る</Link><p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--coral)]">Bulk add</p></div><div className="space-y-6 rounded-[1.6rem] border border-[var(--line)] bg-white p-5 shadow-[0_15px_50px_rgba(22,66,61,0.04)] sm:p-8"><div><h1 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--forest)]">まとめて追加</h1><p className="mt-2 text-sm leading-6 text-[var(--muted)]">1行に1件ずつ名称を入力してください。最大{BULK_ITEM_LIMIT}件を、共通の情報で登録できます。</p></div><label className="block text-sm font-bold text-[var(--forest)]">名称<textarea autoFocus value={rawNames} onChange={(event) => setRawNames(event.target.value)} rows={10} placeholder={"例：\n夜と霧\n千と千尋の神隠し\nKind of Blue"} className="focus-ring mt-2 w-full resize-y rounded-xl border border-[var(--line)] bg-[#fbfcf9] px-4 py-3 text-sm leading-6 outline-none focus:border-[var(--forest)]" /></label><div className="rounded-xl bg-[#f3f6f3] px-4 py-3 text-sm text-[var(--muted)]"><span className="font-bold text-[var(--forest)]">{preview.names.length}件</span>を登録予定{preview.duplicateCount > 0 && <span>（重複{preview.duplicateCount}件を除外）</span>}</div>{preview.errors.length > 0 && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">{preview.errors.map((item) => <p key={`${item.line}-${item.message}`}>{item.line ? `${item.line}行目：` : ""}{item.message}</p>)}</div>}<div className="grid gap-5 sm:grid-cols-2"><label className="block text-sm font-bold text-[var(--forest)]">種別<select value={kind} onChange={(event) => setKind(event.target.value as ItemKind)} className="focus-ring mt-2 w-full rounded-xl border border-[var(--line)] bg-[#fbfcf9] px-4 py-3 text-sm outline-none">{ITEM_KINDS.map((value) => <option key={value} value={value}>{ITEM_KIND_LABELS[value]}</option>)}</select></label><label className="block text-sm font-bold text-[var(--forest)]">状態<select value={status} onChange={(event) => setStatus(event.target.value as ItemStatus)} className="focus-ring mt-2 w-full rounded-xl border border-[var(--line)] bg-[#fbfcf9] px-4 py-3 text-sm outline-none">{ITEM_STATUSES.map((value) => <option key={value} value={value}>{ITEM_STATUS_LABELS[value]}</option>)}</select></label></div><label className="block text-sm font-bold text-[var(--forest)]">タグ<span className="mt-2 block"><input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="お気に入り, 2026" className="focus-ring w-full rounded-xl border border-[var(--line)] bg-[#fbfcf9] px-4 py-3 text-sm outline-none focus:border-[var(--forest)]" /></span><span className="mt-1 block text-[11px] font-normal text-[var(--muted)]">カンマ区切りで全件に適用</span></label>{error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">{error}</p>}{success && <p role="status" className="rounded-xl bg-[var(--mint)] px-4 py-3 text-sm leading-6 text-[var(--forest)]">{success}</p>}<div className="flex justify-end"><button disabled={!canSubmit} className="focus-ring inline-flex items-center gap-2 rounded-xl bg-[var(--forest)] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#225c54] disabled:cursor-not-allowed disabled:opacity-50">{busy ? <LoaderCircle className="animate-spin" size={17} /> : <Save size={17} />} {preview.names.length}件を登録</button></div></div></form>;
}
