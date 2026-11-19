"use client";

import { FormEvent, useEffect, useState } from "react";
import { CalendarClock, Edit3, History, LoaderCircle, Plus, Save, Trash2, Wrench, X } from "lucide-react";
import {
  ITEM_EVENT_TYPE_LABELS,
  ITEM_EVENT_TYPES,
  formatYen,
  todayInTokyo,
  type ItemEvent,
  type ItemEventType,
  type MaintenanceState,
} from "@/lib/event-schema";

type EventsResponse = { events?: ItemEvent[]; maintenance?: MaintenanceState; error?: string };

type Draft = {
  type: ItemEventType;
  occurred_on: string;
  title: string;
  note: string;
  amount_yen: string;
  usage_reading: string;
  next_due_on: string;
  next_due_usage: string;
};

function emptyDraft(): Draft {
  return { type: "maintenance", occurred_on: todayInTokyo(), title: "", note: "", amount_yen: "", usage_reading: "", next_due_on: "", next_due_usage: "" };
}

function draftFromEvent(event: ItemEvent): Draft {
  const text = (value: number | string | null) => (value === null ? "" : String(value));
  return {
    type: event.type,
    occurred_on: event.occurred_on,
    title: event.title,
    note: event.note,
    amount_yen: text(event.amount_yen),
    usage_reading: text(event.usage_reading),
    next_due_on: text(event.next_due_on),
    next_due_usage: text(event.next_due_usage),
  };
}

const inputClass = "focus-ring mt-1.5 w-full rounded-xl border border-[var(--line)] bg-[#fbfcf9] px-3 py-2.5 text-sm font-normal text-[var(--ink)] outline-none focus:border-[var(--forest)]";

export function MaintenanceBadge({ state }: { state: MaintenanceState }) {
  if (state.status === "none") return null;
  const tone = state.status === "overdue" ? "bg-red-50 text-red-700" : state.status === "due_soon" ? "bg-amber-50 text-amber-800" : "bg-[var(--mint)] text-[var(--forest)]";
  const label = state.status === "overdue" ? "メンテナンス期限切れ" : state.status === "due_soon" ? "メンテナンス間近" : "次回メンテナンス";
  const parts = [state.nextDueOn && `${state.nextDueOn}まで`, state.nextDueUsage !== null && `${state.nextDueUsage.toLocaleString("ja-JP")}到達まで`].filter(Boolean);
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${tone}`}><CalendarClock size={14} /> {label}{parts.length > 0 && `：${parts.join(" / ")}`}</span>;
}

export function ItemTimeline({ itemId }: { itemId: string }) {
  const [events, setEvents] = useState<ItemEvent[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [version, setVersion] = useState(0);
  const reload = () => setVersion((current) => current + 1);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/items/${itemId}/events`, { cache: "no-store", signal: controller.signal });
        const body = (await response.json()) as EventsResponse;
        if (!response.ok || !body.events || !body.maintenance) throw new Error(body.error || "履歴を読み込めませんでした");
        setEvents(body.events);
        setMaintenance(body.maintenance);
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setError(loadError instanceof Error ? loadError.message : "履歴を読み込めませんでした");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [itemId, version]);

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    setBusy(true); setError("");
    const isMaintenance = draft.type === "maintenance";
    const payload = { ...draft, next_due_on: isMaintenance ? draft.next_due_on : "", next_due_usage: isMaintenance ? draft.next_due_usage : "" };
    try {
      const response = await fetch(editingId ? `/api/items/${itemId}/events/${editingId}` : `/api/items/${itemId}/events`, {
        method: editingId ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as { error?: string; details?: Array<{ message: string }> };
      if (!response.ok) throw new Error(body.details?.[0]?.message || body.error || "保存できませんでした");
      setDraft(null); setEditingId(null);
      reload();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "保存できませんでした");
    } finally { setBusy(false); }
  }

  async function remove(target: ItemEvent) {
    if (!window.confirm(`「${target.title}」の記録を削除しますか？この操作は取り消せません。`)) return;
    setBusy(true); setError("");
    const response = await fetch(`/api/items/${itemId}/events/${target.id}`, { method: "DELETE" });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error || "削除できませんでした");
    } else {
      reload();
    }
    setBusy(false);
  }

  return <section className="mt-8 rounded-[1.6rem] border border-[var(--line)] bg-white p-5 shadow-[0_15px_50px_rgba(22,66,61,0.04)] sm:p-8" aria-labelledby="timeline-heading">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3"><h2 id="timeline-heading" className="inline-flex items-center gap-2 text-lg font-bold text-[var(--forest)]"><History size={19} /> 履歴</h2>{maintenance && <MaintenanceBadge state={maintenance} />}</div>
      {!draft && <button onClick={() => { setDraft(emptyDraft()); setEditingId(null); }} className="focus-ring inline-flex items-center gap-2 rounded-xl bg-[var(--forest)] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#225c54]"><Plus size={14} /> 記録を追加</button>}
    </div>

    {draft && <form onSubmit={submit} className="mt-6 grid gap-4 rounded-2xl border border-[var(--line)] bg-[#fbfcf9] p-4 sm:grid-cols-2">
      <label className="text-xs font-bold text-[var(--forest)]">種類<select value={draft.type} onChange={(event) => update("type", event.target.value as ItemEventType)} className={inputClass}>{ITEM_EVENT_TYPES.map((value) => <option key={value} value={value}>{ITEM_EVENT_TYPE_LABELS[value]}</option>)}</select></label>
      <label className="text-xs font-bold text-[var(--forest)]">日付<input required type="date" value={draft.occurred_on} onChange={(event) => update("occurred_on", event.target.value)} className={inputClass} /></label>
      <label className="text-xs font-bold text-[var(--forest)] sm:col-span-2">タイトル<input required maxLength={160} value={draft.title} onChange={(event) => update("title", event.target.value)} placeholder="例：弦交換、オイル交換、ライブで使用" className={inputClass} /></label>
      <label className="text-xs font-bold text-[var(--forest)]">金額（円）<input inputMode="numeric" value={draft.amount_yen} onChange={(event) => update("amount_yen", event.target.value)} placeholder="任意" className={inputClass} /></label>
      <label className="text-xs font-bold text-[var(--forest)]">使用量・走行距離<input inputMode="decimal" value={draft.usage_reading} onChange={(event) => update("usage_reading", event.target.value)} placeholder="任意（例：12500）" className={inputClass} /></label>
      {draft.type === "maintenance" && <>
        <label className="text-xs font-bold text-[var(--forest)]">次回予定日<input type="date" value={draft.next_due_on} onChange={(event) => update("next_due_on", event.target.value)} className={inputClass} /></label>
        <label className="text-xs font-bold text-[var(--forest)]">次回の使用量・走行距離<input inputMode="decimal" value={draft.next_due_usage} onChange={(event) => update("next_due_usage", event.target.value)} placeholder="任意（例：15000）" className={inputClass} /></label>
      </>}
      <label className="text-xs font-bold text-[var(--forest)] sm:col-span-2">メモ<textarea maxLength={5000} rows={3} value={draft.note} onChange={(event) => update("note", event.target.value)} className={inputClass} /></label>
      <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={() => { setDraft(null); setEditingId(null); }} className="focus-ring inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-[var(--muted)]"><X size={14} /> キャンセル</button><button disabled={busy} className="focus-ring inline-flex items-center gap-1.5 rounded-xl bg-[var(--forest)] px-4 py-2 text-xs font-bold text-white disabled:opacity-60">{busy ? <LoaderCircle className="animate-spin" size={14} /> : <Save size={14} />} {editingId ? "変更を保存" : "記録する"}</button></div>
    </form>}

    {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

    {loading ? <div className="grid place-items-center py-10 text-[var(--muted)]"><LoaderCircle className="animate-spin" size={20} /></div>
      : events.length === 0 ? <p className="mt-6 text-sm text-[var(--muted)]">まだ記録がありません。購入、使用、メンテナンスなどを記録すると、ここに時系列で表示されます。</p>
      : <ol className="mt-6 space-y-0 border-l-2 border-[var(--mint)] pl-5">{events.map((event) => <li key={event.id} className="relative pb-6 last:pb-0">
          <span className="absolute -left-[27px] top-1 grid h-3 w-3 place-items-center rounded-full bg-[var(--forest)]" aria-hidden />
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold text-[var(--muted)]">{event.occurred_on} · {ITEM_EVENT_TYPE_LABELS[event.type]}</p>
              <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-bold text-[var(--forest)]">{event.type === "maintenance" && <Wrench size={13} />}{event.title}</p>
            </div>
            <div className="flex gap-1"><button aria-label="記録を編集" disabled={busy} onClick={() => { setDraft(draftFromEvent(event)); setEditingId(event.id); }} className="focus-ring grid h-8 w-8 place-items-center rounded-lg text-[var(--muted)] hover:bg-[#f3f6f3]"><Edit3 size={14} /></button><button aria-label="記録を削除" disabled={busy} onClick={() => void remove(event)} className="focus-ring grid h-8 w-8 place-items-center rounded-lg text-[var(--coral)] hover:bg-red-50"><Trash2 size={14} /></button></div>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--muted)]">
            {event.amount_yen !== null && <span>金額 {formatYen(event.amount_yen)}</span>}
            {event.usage_reading !== null && <span>使用量 {event.usage_reading.toLocaleString("ja-JP")}</span>}
            {event.next_due_on && <span>次回予定日 {event.next_due_on}</span>}
            {event.next_due_usage !== null && <span>次回の目安 {event.next_due_usage.toLocaleString("ja-JP")}</span>}
          </div>
          {event.note && <p className="mt-2 whitespace-pre-wrap text-xs leading-6 text-[var(--muted)]">{event.note}</p>}
        </li>)}</ol>}
  </section>;
}
