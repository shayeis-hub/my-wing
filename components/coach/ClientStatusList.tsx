"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils/cn";
import type { ClientStatus, StatusFlag } from "@/lib/coach/status";

type Lang = "he" | "en";

const FLAG_STYLE: Record<StatusFlag, string> = {
  silent: "bg-red-50 text-red-600 border-red-200",
  no_data: "bg-red-50 text-red-600 border-red-200",
  weight_up: "bg-orange-50 text-orange-600 border-orange-200",
  low_logging: "bg-amber-50 text-amber-700 border-amber-200",
  new: "bg-wing-elevated text-wing-muted border-wing-border",
};

function flagLabel(flag: StatusFlag, c: ClientStatus, lang: Lang): string {
  const he = lang === "he";
  switch (flag) {
    case "silent": return he ? `לא פעיל/ה ${c.daysSinceActivity} ימים` : `Inactive ${c.daysSinceActivity} days`;
    case "no_data": return he ? "אין נתונים" : "No data";
    case "weight_up": return he ? "עלייה במשקל" : "Weight rising";
    case "low_logging": return he ? "רישום דל" : "Light logging";
    case "new": return he ? "חדש/ה" : "New";
  }
}

function daysAgo(n: number | null, lang: Lang): string {
  if (n == null) return "—";
  if (lang === "he") return n === 0 ? "היום" : n === 1 ? "אתמול" : `לפני ${n} ימים`;
  return n === 0 ? "today" : n === 1 ? "yesterday" : `${n} days ago`;
}

export function ClientStatusList({
  lang,
  getToken,
  onOpen,
}: {
  lang: Lang;
  getToken: () => Promise<string>;
  onOpen: (c: ClientStatus) => void;
}) {
  const he = lang === "he";
  const [clients, setClients] = useState<ClientStatus[] | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [onlyAttention, setOnlyAttention] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const token = await getToken();
      const res = await fetch("/api/coach/status", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { clients: ClientStatus[] };
      setClients(data.clients);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const needsAttention = (c: ClientStatus) => c.flags.some((f) => f !== "new");
  const summary = useMemo(() => {
    const list = clients ?? [];
    return {
      total: list.length,
      activeToday: list.filter((c) => c.daysSinceActivity === 0).length,
      attention: list.filter(needsAttention).length,
    };
  }, [clients]);

  const visible = (clients ?? []).filter((c) => !onlyAttention || needsAttention(c));

  if (clients === null && !error) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => <div key={i} className="h-24 bg-wing-elevated border border-wing-border rounded-2xl animate-pulse" />)}
      </div>
    );
  }

  if (error && clients === null) {
    return (
      <div className="text-center py-8 space-y-3">
        <p className="text-sm text-wing-muted">{he ? "לא הצלחנו לטעון את הסטטוס" : "Couldn't load the status"}</p>
        <button onClick={load} className="px-4 py-2 rounded-xl border border-wing-border text-sm font-bold text-wing-ink">
          {he ? "נסו שוב" : "Try again"}
        </button>
      </div>
    );
  }

  if ((clients ?? []).length === 0) {
    return (
      <p className="text-sm text-wing-muted text-center py-8">
        {he ? "אין עדיין לקוחות - צרו קישור הזמנה בלשונית הלקוחות" : "No clients yet - create an invite link in the Clients tab"}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {[
          { v: summary.total, l: he ? "לקוחות" : "Clients" },
          { v: summary.activeToday, l: he ? "פעילים היום" : "Active today" },
          { v: summary.attention, l: he ? "דורשים תשומת לב" : "Need attention", hot: summary.attention > 0 },
        ].map((s) => (
          <div key={s.l} className="bg-wing-surface border border-wing-border rounded-2xl py-3 text-center">
            <p className={cn("text-2xl font-black tabular", s.hot ? "text-red-500" : "text-wing-ink")}>{s.v}</p>
            <p className="text-[11px] text-wing-muted mt-0.5">{s.l}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1.5">
          {[
            { id: false, l: he ? "הכול" : "All" },
            { id: true, l: he ? "דורשים תשומת לב" : "Needs attention" },
          ].map((f) => (
            <button
              key={String(f.id)}
              onClick={() => setOnlyAttention(f.id)}
              className={cn(
                "text-xs font-semibold px-3 py-1.5 rounded-full border",
                onlyAttention === f.id ? "bg-wing-ink text-wing-elevated border-wing-ink" : "bg-wing-surface text-wing-muted border-wing-border"
              )}
            >
              {f.l}
            </button>
          ))}
        </div>
        <button onClick={load} disabled={loading} aria-label={he ? "רענון" : "Refresh"} className="p-2 text-wing-muted disabled:opacity-40">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {visible.length === 0 && (
        <p className="text-sm text-wing-muted text-center py-6">{he ? "אף לקוח לא דורש תשומת לב כרגע" : "No client needs attention right now"}</p>
      )}

      {visible.map((c) => {
        const cal = c.calorieTarget ? `${c.todayCalories} / ${c.calorieTarget}` : `${c.todayCalories}`;
        return (
          <button
            key={`${c.wingId}_${c.uid}`}
            onClick={() => onOpen(c)}
            className="w-full text-start bg-wing-surface border border-wing-border rounded-2xl p-3.5 space-y-2.5 active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center gap-3">
              <Avatar name={c.displayName} photoURL={c.photoURL} size={38} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-wing-ink text-sm truncate">{c.displayName}</p>
                <p className="text-[11px] text-wing-muted truncate">{c.isPrivate ? (he ? "פרטי" : "Private") : c.wingName}</p>
              </div>
              <div className="flex gap-1 shrink-0" dir="ltr" aria-label={he ? "פעילות 7 ימים אחרונים" : "Activity, last 7 days"}>
                {c.last7.map((on, i) => (
                  <span key={i} className={cn("w-2 h-2 rounded-full", on ? "bg-wing-success" : "bg-wing-border")} />
                ))}
              </div>
            </div>

            {c.flags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {c.flags.map((f) => (
                  <span key={f} className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full border", FLAG_STYLE[f])}>
                    {flagLabel(f, c, lang)}
                  </span>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-wing-muted">
              <p>{he ? "צ'ק-אין אחרון: " : "Last check-in: "}<span className="text-wing-ink font-medium">{daysAgo(c.daysSinceCheckin, lang)}</span></p>
              <p>{he ? "ארוחה אחרונה: " : "Last meal: "}<span className="text-wing-ink font-medium">{daysAgo(c.daysSinceMeal, lang)}</span></p>
              <p>{he ? "קלוריות היום: " : "Calories today: "}<span className="text-wing-ink font-medium tabular" dir="ltr">{cal}</span></p>
              <p>
                {he ? "משקל: " : "Weight: "}
                {c.weightKg != null ? (
                  <span className="text-wing-ink font-medium tabular">
                    {c.weightKg} {he ? "ק\"ג" : "kg"}
                    {c.weightChangeKg != null && c.weightChangeKg !== 0 && (
                      <span className={cn("ms-1", c.weightChangeKg < 0 ? "text-wing-success" : "text-red-500")} dir="ltr">
                        ({c.weightChangeKg > 0 ? "+" : ""}{c.weightChangeKg})
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="text-wing-ink font-medium">—</span>
                )}
              </p>
              {c.streak > 0 && (
                <p className="col-span-2">{he ? "רצף צ'ק-אין: " : "Check-in streak: "}<span className="text-wing-ink font-medium">{c.streak} {he ? "ימים" : "days"}</span></p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
