"use client";

import { format, parseISO } from "date-fns";
import { he, enUS } from "date-fns/locale";
import type { WeightLog } from "@/types";
import { calculateBMI } from "@/lib/utils/calculator";

interface WeightLogTableProps {
  logs: WeightLog[]; // ascending by date
  heightCm?: number;
  lang: "he" | "en";
}

function DeltaCell({ deltaKg, pct }: { deltaKg: number | null; pct: number | null }) {
  if (deltaKg === null || pct === null) {
    return <span className="text-wing-subtle">—</span>;
  }
  const isLoss = deltaKg < 0;
  const isFlat = deltaKg === 0;
  const color = isFlat ? "text-wing-muted" : isLoss ? "text-green-600" : "text-red-500";
  const sign = deltaKg > 0 ? "+" : "";
  return (
    <div className={`${color} leading-tight`}>
      <div className="font-semibold tabular-nums">{sign}{deltaKg.toFixed(1)}</div>
      <div className="text-[11px] tabular-nums">{sign}{pct.toFixed(1)}%</div>
    </div>
  );
}

export function WeightLogTable({ logs, heightCm, lang }: WeightLogTableProps) {
  if (logs.length === 0) return null;

  const locale = lang === "he" ? he : enUS;
  const startWeight = logs[0].weightKg;

  const rows = logs
    .map((log, i) => {
      const prevWeight = i > 0 ? logs[i - 1].weightKg : null;
      const deltaFromLast = prevWeight !== null ? +(log.weightKg - prevWeight).toFixed(1) : null;
      const pctFromLast = prevWeight ? +(((log.weightKg - prevWeight) / prevWeight) * 100).toFixed(1) : null;
      const deltaFromStart = +(log.weightKg - startWeight).toFixed(1);
      const pctFromStart = startWeight ? +(((log.weightKg - startWeight) / startWeight) * 100).toFixed(1) : null;
      const bmi = heightCm ? calculateBMI(log.weightKg, heightCm) : null;
      return { ...log, deltaFromLast, pctFromLast, deltaFromStart, pctFromStart, bmi };
    })
    .reverse(); // newest first

  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-sm min-w-[480px]">
        <thead>
          <tr className="text-wing-subtle text-[11px] uppercase tracking-wide">
            <th className="text-right font-medium px-2 py-1.5">{lang === "he" ? "תאריך" : "Date"}</th>
            <th className="text-right font-medium px-2 py-1.5">{lang === "he" ? "משקל" : "Weight"}</th>
            <th className="text-right font-medium px-2 py-1.5">{lang === "he" ? "משקילה אחרונה" : "vs Last"}</th>
            <th className="text-right font-medium px-2 py-1.5">{lang === "he" ? "מהתחלה" : "vs Start"}</th>
            <th className="text-right font-medium px-2 py-1.5">BMI</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-wing-border">
              <td className="px-2 py-2 text-wing-ink whitespace-nowrap">
                {format(parseISO(row.date), "d/M/yy", { locale })}
              </td>
              <td className="px-2 py-2 font-bold text-wing-ink tabular-nums">
                {row.weightKg} <span className="font-normal text-wing-subtle text-[11px]">{lang === "he" ? "ק\"ג" : "kg"}</span>
              </td>
              <td className="px-2 py-2">
                <DeltaCell deltaKg={row.deltaFromLast} pct={row.pctFromLast} />
              </td>
              <td className="px-2 py-2">
                <DeltaCell deltaKg={row.deltaFromStart} pct={row.pctFromStart} />
              </td>
              <td className="px-2 py-2 text-wing-ink tabular-nums">
                {row.bmi ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
