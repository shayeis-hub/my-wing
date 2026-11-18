"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { ClientDataDay, ClientDataResponse } from "@/lib/coach/clientData";

const RANGES = [7, 30, 90] as const;

const MEAL_TYPE: Record<string, { he: string; en: string }> = {
  breakfast: { he: "בוקר", en: "Breakfast" },
  lunch: { he: "צהריים", en: "Lunch" },
  dinner: { he: "ערב", en: "Dinner" },
  snack: { he: "נשנוש", en: "Snack" },
};

const MATCH_STYLE: Record<string, string> = {
  match: "text-wing-success",
  partial: "text-amber-700",
  off: "text-red-600",
  unknown: "text-wing-muted",
};

function dayLabel(date: string, today: string, he: boolean): string {
  const d = new Date(`${date}T12:00:00`);
  const wd = d.toLocaleDateString(he ? "he-IL" : "en-GB", { weekday: "short" });
  const rest = `${d.getDate()}/${d.getMonth() + 1}`;
  if (date === today) return `${he ? "היום" : "Today"} · ${rest}`;
  return `${wd} ${rest}`;
}

const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-wing-elevated border border-wing-border rounded-2xl px-3 py-2.5">
      <p className="text-[11px] text-wing-muted">{label}</p>
      <p className="text-lg font-black text-wing-ink tabular leading-tight" dir="ltr">{value}</p>
      {sub && <p className="text-[11px] text-wing-subtle">{sub}</p>}
    </div>
  );
}

function WeightChart({ points, he }: { points: { date: string; kg: number }[]; he: boolean }) {
  if (points.length < 2) return null;
  const W = 300, H = 70, P = 6;
  const kgs = points.map((p) => p.kg);
  const min = Math.min(...kgs), max = Math.max(...kgs);
  const span = max - min || 1;
  const t0 = new Date(points[0].date).getTime();
  const t1 = new Date(points[points.length - 1].date).getTime() || t0 + 1;
  const x = (d: string) => P + ((new Date(d).getTime() - t0) / Math.max(1, t1 - t0)) * (W - 2 * P);
  const y = (kg: number) => H - P - ((kg - min) / span) * (H - 2 * P);
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(p.date).toFixed(1)},${y(p.kg).toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  return (
    <div className="bg-wing-elevated border border-wing-border rounded-2xl px-3 py-2.5">
      <div className="flex items-baseline justify-between mb-1">
        <p className="text-[11px] text-wing-muted">{he ? "משקל" : "Weight"}</p>
        <p className="text-[11px] text-wing-subtle tabular" dir="ltr">{min.toFixed(1)} – {max.toFixed(1)} kg</p>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[70px]" role="img" aria-label={he ? "גרף משקל" : "Weight chart"} style={{ direction: "ltr" }}>
        <path d={path} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" className="text-wing-heat" />
        {points.map((p) => <circle key={p.date} cx={x(p.date)} cy={y(p.kg)} r="2.2" className="fill-wing-heat" />)}
        <circle cx={x(last.date)} cy={y(last.kg)} r="3.6" className="fill-wing-heat" />
      </svg>
    </div>
  );
}

function DayRow({ day, today, he, calTarget }: { day: ClientDataDay; today: string; he: boolean; calTarget: number | null }) {
  const [open, setOpen] = useState(false);
  const c = day.checkin;
  const hasData = day.meals.length > 0 || !!c;
  return (
    <div className="bg-wing-elevated border border-wing-border rounded-2xl overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-3 px-3.5 py-3 text-start" aria-expanded={open}>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-wing-ink">{dayLabel(day.date, today, he)}</p>
          <p className="text-[11px] text-wing-muted tabular truncate">
            {[
              day.meals.length ? `${day.calories}${calTarget ? `/${calTarget}` : ""} ${he ? 'קק"ל' : "kcal"}` : "",
              day.steps != null ? `${day.steps.toLocaleString()} ${he ? "צעדים" : "steps"}` : "",
              day.weightKg != null ? `${day.weightKg} kg` : "",
              c?.workouts.length ? (he ? "אימון" : "Workout") : "",
            ].filter(Boolean).join(" · ") || (he ? "אין נתונים" : "No data")}
          </p>
        </div>
        {hasData && <ChevronDown size={16} className={cn("text-wing-subtle transition-transform shrink-0", open && "rotate-180")} />}
      </button>

      {open && hasData && (
        <div className="px-3.5 pb-3.5 space-y-3 border-t border-wing-border pt-3">
          {day.meals.length > 0 && (
            <div className="space-y-2.5">
              {day.meals.map((m) => (
                <div key={m.id} className="flex gap-2.5">
                  {m.imageURL && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.imageURL} alt="" loading="lazy" className="w-12 h-12 rounded-xl object-cover shrink-0 bg-wing-surface" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-wing-ink">
                      <span className="font-bold">{(MEAL_TYPE[m.mealType]?.[he ? "he" : "en"]) ?? m.mealType}</span>
                      {m.time ? <span className="text-wing-muted"> · {m.time}</span> : null}
                    </p>
                    <p className="text-sm text-wing-ink/80 leading-snug">{m.description}</p>
                    <p className="text-[11px] text-wing-muted tabular mt-0.5" dir="ltr">
                      {Math.round(m.calories)} kcal · P {Math.round(m.protein)} · C {Math.round(m.carbs)} · F {Math.round(m.fat)}
                    </p>
                    {m.notes && <p className="text-[11px] text-wing-muted mt-0.5">{m.notes}</p>}
                    {m.menuMatch && (
                      <p className={cn("text-[11px] font-semibold mt-0.5", MATCH_STYLE[m.menuMatch.status] ?? MATCH_STYLE.unknown)}>
                        {he ? "התאמה לתפריט" : "Menu fit"} {m.menuMatch.score}{m.menuMatch.note ? ` · ${m.menuMatch.note}` : ""}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              <p className="text-[11px] text-wing-muted tabular" dir="ltr">
                {he ? "סה״כ" : "Total"}: {day.calories} kcal · P {day.protein} · C {day.carbs} · F {day.fat}
              </p>
            </div>
          )}

          {c && (
            <div className="space-y-1.5 text-sm text-wing-ink">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
                {c.waterGlasses != null && <span>{he ? "מים" : "Water"} <b>{c.waterGlasses}</b></span>}
                {c.vegetablesServings != null && <span>{he ? "ירקות" : "Veg"} <b>{c.vegetablesServings}</b></span>}
                {c.mood != null && <span>{he ? "מצב רוח" : "Mood"} <b>{c.mood}/5</b></span>}
                {c.eatingWindow && <span>{he ? "חלון אכילה" : "Eating window"} <b dir="ltr">{c.eatingWindow.open}–{c.eatingWindow.close}</b></span>}
              </div>
              {c.workouts.map((w, i) => {
                const detail = [w.type, w.durationMinutes ? `${w.durationMinutes} ${he ? "דק׳" : "min"}` : "", w.distanceKm ? `${w.distanceKm} km` : "", w.intensity, w.description].filter(Boolean).join(" · ");
                return (
                  <p key={i} className="text-[13px]">
                    <b>{he ? "אימון" : "Workout"}</b>{detail ? ` · ${detail}` : ""}
                  </p>
                );
              })}
              {c.notes && <p className="text-[13px] text-wing-ink/80 whitespace-pre-line">&ldquo;{c.notes}&rdquo;</p>}
              {c.daySummary && (
                <div className="bg-wing-surface border border-wing-border rounded-xl px-3 py-2 text-[12px] text-wing-muted leading-relaxed">
                  <p className="font-bold text-wing-ink text-[11px] mb-0.5">{he ? "סיכום היום (AI)" : "AI day summary"}</p>
                  {c.daySummary.summary}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** The dietitian's "data" view of one client: trends first, then day by day. */
export function ClientDataView({ clientId, getToken, he }: { clientId: string; getToken: () => Promise<string>; he: boolean }) {
  const [range, setRange] = useState<(typeof RANGES)[number]>(30);
  const [data, setData] = useState<ClientDataResponse | null>(null);
  const [error, setError] = useState(false);
  const [showEmpty, setShowEmpty] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    setData(null);
    try {
      const token = await getToken();
      const res = await fetch(`/api/coach/client-data?clientId=${encodeURIComponent(clientId)}&days=${range}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      setData((await res.json()) as ClientDataResponse);
    } catch {
      setError(true);
    }
  }, [clientId, range, getToken]);

  useEffect(() => { void load(); }, [load]);

  const stats = useMemo(() => {
    if (!data) return null;
    const withMeals = data.days.filter((d) => d.meals.length > 0);
    const withSteps = data.days.filter((d) => d.steps != null);
    const withWater = data.days.filter((d) => d.checkin?.waterGlasses != null);
    const inRange = data.weights.filter((w) => w.date >= data.days[data.days.length - 1].date);
    const wChange = inRange.length >= 2 ? Math.round((inRange[inRange.length - 1].kg - inRange[0].kg) * 10) / 10 : null;
    return {
      avgCal: avg(withMeals.map((d) => d.calories)),
      avgSteps: avg(withSteps.map((d) => d.steps as number)),
      avgWater: withWater.length ? withWater.reduce((a, d) => a + (d.checkin?.waterGlasses as number), 0) / withWater.length : null,
      loggedDays: data.days.filter((d) => d.meals.length > 0 || d.checkin).length,
      lastWeight: inRange.length ? inRange[inRange.length - 1].kg : null,
      wChange,
      inRange,
    };
  }, [data]);

  const emptyDays = data ? data.days.filter((d) => d.meals.length === 0 && !d.checkin).length : 0;
  const shown = data ? data.days.filter((d) => showEmpty || d.meals.length > 0 || d.checkin) : [];

  return (
    <div className="flex-1 overflow-y-auto px-3 pt-3 pb-24 space-y-3" dir={he ? "rtl" : "ltr"}>
      <div className="flex gap-1.5">
        {RANGES.map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={cn("px-3.5 py-1.5 rounded-full text-xs font-bold border", range === r ? "bg-wing-ink text-wing-elevated border-wing-ink" : "bg-wing-surface text-wing-muted border-wing-border")}
          >
            {he ? `${r} ימים` : `${r} days`}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-wing-elevated border border-wing-border rounded-2xl px-4 py-5 text-center">
          <p className="text-sm text-wing-muted mb-2">{he ? "לא הצלחנו לטעון את הנתונים" : "Couldn't load the data"}</p>
          <button onClick={() => void load()} className="text-sm font-bold text-wing-heat">{he ? "נסו שוב" : "Try again"}</button>
        </div>
      )}

      {!data && !error && <div className="h-40 bg-wing-elevated border border-wing-border rounded-2xl animate-pulse" />}

      {data && stats && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Tile label={he ? "קלוריות ליום (ממוצע)" : "Avg calories / day"} value={stats.avgCal != null ? String(stats.avgCal) : "—"} sub={data.targets.calories ? `${he ? "יעד" : "Target"} ${data.targets.calories}` : undefined} />
            <Tile label={he ? "צעדים ליום (ממוצע)" : "Avg steps / day"} value={stats.avgSteps != null ? stats.avgSteps.toLocaleString() : "—"} sub={data.targets.steps ? `${he ? "יעד" : "Target"} ${data.targets.steps.toLocaleString()}` : undefined} />
            <Tile
              label={he ? "משקל" : "Weight"}
              value={stats.lastWeight != null ? `${stats.lastWeight}` : "—"}
              sub={stats.wChange != null ? `${stats.wChange > 0 ? "+" : ""}${stats.wChange} ${he ? `ב-${range} ימים` : `in ${range} days`}${data.targets.weightKg ? ` · ${he ? "יעד" : "goal"} ${data.targets.weightKg}` : ""}` : data.targets.weightKg ? `${he ? "יעד" : "Goal"} ${data.targets.weightKg}` : undefined}
            />
            <Tile label={he ? "ימים עם רישום" : "Days logged"} value={`${stats.loggedDays}/${range}`} sub={stats.avgWater != null ? `${he ? "מים" : "Water"} ${stats.avgWater.toFixed(1)} ${he ? "כוסות ביום" : "glasses/day"}` : undefined} />
          </div>

          <WeightChart points={stats.inRange} he={he} />

          <div className="space-y-2">
            {shown.length === 0 ? (
              <p className="text-sm text-wing-muted text-center py-6">{he ? "אין נתונים בטווח הזה" : "No data in this range"}</p>
            ) : (
              shown.map((d) => <DayRow key={d.date} day={d} today={data.today} he={he} calTarget={data.targets.calories} />)
            )}
            {emptyDays > 0 && (
              <button onClick={() => setShowEmpty((s) => !s)} className="w-full text-xs font-semibold text-wing-muted py-2">
                {showEmpty ? (he ? "הסתרת ימים בלי נתונים" : "Hide days without data") : he ? `הצגת ${emptyDays} ימים בלי נתונים` : `Show ${emptyDays} days without data`}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
