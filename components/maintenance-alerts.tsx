"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";
import type { MaintenanceAlert } from "@/lib/item-types";

function describe(alert: MaintenanceAlert) {
  const parts: string[] = [];
  if (alert.daysUntilDue !== null) parts.push(alert.daysUntilDue < 0 ? `${-alert.daysUntilDue}日超過` : alert.daysUntilDue === 0 ? "今日まで" : `あと${alert.daysUntilDue}日`);
  if (alert.nextDueUsage !== null) parts.push(`目安 ${alert.nextDueUsage.toLocaleString("ja-JP")}${alert.latestUsage !== null ? `（現在 ${alert.latestUsage.toLocaleString("ja-JP")}）` : ""}`);
  return parts.join(" / ");
}

/** Dashboard strip for upcoming / overdue maintenance. Renders nothing when there is nothing due. */
export function MaintenanceAlerts() {
  const [alerts, setAlerts] = useState<MaintenanceAlert[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/maintenance", { cache: "no-store", signal: controller.signal })
      .then(async (response) => (response.ok ? ((await response.json()) as { alerts: MaintenanceAlert[] }).alerts : []))
      .then(setAlerts)
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  if (alerts.length === 0) return null;
  return <section aria-label="メンテナンス予定" className="mb-6 rounded-[1.4rem] border border-amber-200 bg-amber-50/70 p-4 sm:p-5"><p className="inline-flex items-center gap-2 text-sm font-bold text-amber-900"><CalendarClock size={16} /> メンテナンスの予定があります</p><ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{alerts.map((alert) => <li key={alert.itemId}><Link href={`/items/${alert.itemId}`} className="focus-ring flex items-center justify-between gap-3 rounded-xl bg-white px-3.5 py-2.5 text-xs hover:shadow-sm"><span className="truncate font-bold text-[var(--forest)]">{alert.name}</span><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${alert.status === "overdue" ? "bg-red-50 text-red-700" : "bg-amber-100 text-amber-900"}`}>{alert.status === "overdue" ? "期限切れ" : "間近"} {describe(alert)}</span></Link></li>)}</ul></section>;
}
