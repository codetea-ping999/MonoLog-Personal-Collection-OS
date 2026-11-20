"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Download, Info, LoaderCircle } from "lucide-react";
import { ITEM_KIND_LABELS, ITEM_KINDS, ITEM_STATUS_LABELS, type ItemKind } from "@/lib/item-schema";
import { formatYen } from "@/lib/event-schema";
import type { AnalyticsSummary, Granularity, PeriodRow } from "@/lib/analytics";

type AnalyticsResponse = { summary?: AnalyticsSummary; truncated?: boolean; error?: string };

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return <div className="rounded-2xl border border-[var(--line)] bg-white p-4"><p className="text-[11px] font-bold text-[var(--muted)]">{label}</p><p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--forest)]">{value}</p>{hint && <p className="mt-1 text-[11px] text-[var(--muted)]">{hint}</p>}</div>;
}

function SpendingChart({ periods }: { periods: PeriodRow[] }) {
  const max = Math.max(1, ...periods.map((row) => Math.max(row.spending, row.sale)));
  if (periods.every((row) => row.spending === 0 && row.sale === 0)) {
    return <p className="py-10 text-center text-sm text-[var(--muted)]">金額の入った購入・売却・メンテナンスの記録がまだありません。</p>;
  }
  return <div>
    <div className="mb-3 flex flex-wrap gap-4 text-[11px] font-semibold text-[var(--muted)]"><span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[var(--forest)]" /> 購入</span><span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#8fb9aa]" /> 維持費（メンテ・改造・処分）</span><span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[var(--coral)]" /> 売却</span></div>
    <ul className="space-y-2">{periods.map((row) => <li key={row.period} className="grid grid-cols-[4.5rem_1fr] items-center gap-3 text-xs" title={`購入 ${formatYen(row.purchase)} / 維持費 ${formatYen(row.upkeep)} / 売却 ${formatYen(row.sale)}`}>
      <span className="font-semibold tabular-nums text-[var(--muted)]">{row.period}</span>
      <div className="space-y-1">
        <div className="flex h-3.5 items-center"><div className="h-full rounded-l-sm bg-[var(--forest)]" style={{ width: `${(row.purchase / max) * 100}%` }} /><div className="h-full rounded-r-sm bg-[#8fb9aa]" style={{ width: `${(row.upkeep / max) * 100}%` }} />{row.spending > 0 && <span className="ml-2 tabular-nums text-[11px] text-[var(--ink)]">{formatYen(row.spending)}</span>}</div>
        {row.sale > 0 && <div className="flex h-2 items-center"><div className="h-full rounded-sm bg-[var(--coral)]" style={{ width: `${(row.sale / max) * 100}%` }} /><span className="ml-2 tabular-nums text-[11px] text-[var(--coral)]">{formatYen(row.sale)}</span></div>}
      </div>
    </li>)}</ul>
  </div>;
}

export function AnalyticsDashboard() {
  const [granularity, setGranularity] = useState<Granularity>("month");
  const [kind, setKind] = useState<"" | ItemKind>("");
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      const params = new URLSearchParams({ granularity });
      if (kind) params.set("kind", kind);
      try {
        const response = await fetch(`/api/analytics?${params.toString()}`, { cache: "no-store", signal: controller.signal });
        const body = (await response.json()) as AnalyticsResponse;
        if (!response.ok || !body.summary) throw new Error(body.error || "分析データを読み込めませんでした");
        setData(body); setError("");
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setError(loadError instanceof Error ? loadError.message : "分析データを読み込めませんでした");
      }
    }
    void load();
    return () => controller.abort();
  }, [granularity, kind]);

  const summary = data?.summary;
  const exportQuery = kind ? `&kind=${kind}` : "";
  const net = summary ? summary.totals.purchase + summary.totals.upkeep - summary.totals.sale : 0;

  return <main className="min-h-screen px-5 py-8 sm:px-8 lg:px-12"><div className="mx-auto max-w-5xl">
    <Link href="/" className="focus-ring inline-flex items-center gap-2 text-xs font-bold text-[var(--muted)] hover:text-[var(--forest)]"><ArrowLeft size={15} /> 一覧へ戻る</Link>
    <div className="mt-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[var(--coral)]">Insights</p><h1 className="text-3xl font-semibold tracking-[-0.05em] text-[var(--forest)] sm:text-5xl">支出とコレクション</h1></div>
      <div className="flex flex-wrap gap-2"><select aria-label="種別で絞り込み" value={kind} onChange={(event) => setKind(event.target.value as "" | ItemKind)} className="focus-ring rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-xs font-bold text-[var(--muted)] outline-none"><option value="">すべての種別</option>{ITEM_KINDS.map((value) => <option key={value} value={value}>{ITEM_KIND_LABELS[value]}</option>)}</select><div className="inline-flex rounded-xl border border-[var(--line)] bg-white p-1" role="group" aria-label="集計単位">{(["month", "year"] as const).map((value) => <button key={value} aria-pressed={granularity === value} onClick={() => setGranularity(value)} className={`focus-ring rounded-lg px-3 py-1.5 text-xs font-bold ${granularity === value ? "bg-[var(--forest)] text-white" : "text-[var(--muted)]"}`}>{value === "month" ? "月別" : "年別"}</button>)}</div></div>
    </div>

    {error ? <div className="mt-8 rounded-2xl bg-red-50 px-5 py-6 text-sm text-red-700">{error}</div> : !summary ? <div className="grid place-items-center py-24 text-[var(--muted)]"><LoaderCircle className="animate-spin" size={22} /></div> : <>
      <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="購入金額の合計" value={formatYen(summary.totals.purchase)} />
        <Stat label="維持費の合計" value={formatYen(summary.totals.upkeep)} hint="メンテナンス・改造・処分費用" />
        <Stat label="売却金額の合計" value={formatYen(summary.totals.sale)} hint={`差し引き ${formatYen(net)} の支出`} />
        <Stat label="現在の評価額" value={formatYen(summary.totals.recordedValue)} hint={summary.totals.recordedValue > 0 ? `同じアイテムの購入金額 ${formatYen(summary.totals.purchaseOfValuedItems)}` : "アイテム編集で評価額を入力できます"} />
      </section>

      {(summary.coverage.ownedWithoutPurchaseAmount > 0 || summary.coverage.eventsWithoutAmount > 0) && <p className="mt-4 inline-flex items-start gap-2 rounded-xl bg-[#f3f6f3] px-4 py-3 text-xs leading-5 text-[var(--muted)]"><Info size={14} className="mt-0.5 shrink-0" /> 所有中 {summary.ownedCount} 件のうち {summary.coverage.ownedWithoutPurchaseAmount} 件は購入金額の記録がなく、金額なしの購入・売却記録が {summary.coverage.eventsWithoutAmount} 件あります。これらは合計に含まれていません。</p>}

      <section className="mt-8 rounded-[1.6rem] border border-[var(--line)] bg-white p-5 sm:p-8"><h2 className="text-lg font-bold text-[var(--forest)]">{granularity === "month" ? "月別" : "年別"}の支出と売却</h2><p className="mt-1 text-xs text-[var(--muted)]">{granularity === "month" ? "直近24か月" : "直近20年"}。金額のある記録の日付で集計しています。</p><div className="mt-6"><SpendingChart periods={summary.periods} /></div></section>

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-[1.6rem] border border-[var(--line)] bg-white p-5 sm:p-6"><h2 className="text-sm font-bold text-[var(--forest)]">種別ごとの件数</h2><ul className="mt-4 space-y-2 text-sm">{summary.byKind.length === 0 ? <li className="text-[var(--muted)]">アイテムがありません</li> : summary.byKind.map((row) => <li key={row.kind} className="flex justify-between"><span>{ITEM_KIND_LABELS[row.kind]}</span><span className="font-bold tabular-nums text-[var(--forest)]">{row.count}</span></li>)}</ul></div>
        <div className="rounded-[1.6rem] border border-[var(--line)] bg-white p-5 sm:p-6"><h2 className="text-sm font-bold text-[var(--forest)]">状態ごとの件数</h2><ul className="mt-4 space-y-2 text-sm">{summary.byStatus.length === 0 ? <li className="text-[var(--muted)]">アイテムがありません</li> : summary.byStatus.map((row) => <li key={row.status} className="flex justify-between"><span>{ITEM_STATUS_LABELS[row.status]}</span><span className="font-bold tabular-nums text-[var(--forest)]">{row.count}</span></li>)}</ul></div>
      </section>

      <section className="mt-8 rounded-[1.6rem] border border-[var(--line)] bg-white p-5 sm:p-6"><h2 className="text-sm font-bold text-[var(--forest)]">CSVでエクスポート</h2><p className="mt-1 text-xs text-[var(--muted)]">表計算ソフトでの分析やバックアップに使えます。{kind ? `「${ITEM_KIND_LABELS[kind]}」のみを出力します。` : ""}</p><div className="mt-4 flex flex-wrap gap-2"><a href={`/api/export?dataset=items${exportQuery}`} className="focus-ring inline-flex items-center gap-2 rounded-xl bg-[var(--forest)] px-4 py-2.5 text-xs font-bold text-white"><Download size={14} /> アイテム一覧</a><a href={`/api/export?dataset=events${exportQuery}`} className="focus-ring inline-flex items-center gap-2 rounded-xl border border-[var(--line)] px-4 py-2.5 text-xs font-bold text-[var(--forest)]"><Download size={14} /> 履歴（購入・売却・メンテナンス）</a></div></section>
      {data?.truncated && <p className="mt-4 text-xs text-[var(--muted)]">データ件数が上限に達したため、一部のみ集計しています。</p>}
    </>}
  </div></main>;
}
