"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { format, parseISO } from "date-fns";
import { he, enUS } from "date-fns/locale";
import type { WeightLog } from "@/types";
import { kgToLb } from "@/lib/utils/units";

interface WeightChartProps {
  logs: WeightLog[];
  targetWeight?: number;
  lang?: "he" | "en";
  /** Book mode's profile is imperial — display converts here, storage stays kg. */
  imperial?: boolean;
}

export function WeightChart({ logs, targetWeight, lang = "he", imperial = false }: WeightChartProps) {
  const locale = lang === "he" ? he : enUS;
  const kg = imperial ? "lb" : lang === "he" ? "ק\"ג" : "kg";
  const toDisplay = (w: number) => (imperial ? +kgToLb(w).toFixed(1) : w);
  const targetDisplay = targetWeight != null ? toDisplay(targetWeight) : undefined;

  if (logs.length === 0) {
    return (
      <p className="text-sm text-slate-400 text-center py-4">
        {lang === "he" ? "עדיין אין נתוני משקל — עדכן משקל בצ'ק-אין היומי" : "No weight data yet — log a weight in the daily check-in"}
      </p>
    );
  }

  const data = logs.map((l) => ({
    date: l.date,
    label: format(parseISO(l.date), "d/M", { locale }),
    weight: toDisplay(l.weightKg),
  }));

  const weights = data.map((d) => d.weight);
  const minW = Math.min(...weights) - 1;
  const maxW = Math.max(...weights) + 1;
  const first = data[0].weight;
  const last = data[data.length - 1].weight;
  const diff = +(last - first).toFixed(1);
  const diffText = diff < 0 ? `${diff} ${kg}` : diff > 0 ? `+${diff} ${kg}` : (lang === "he" ? "ללא שינוי" : "No change");
  const diffColor = diff < 0 ? "text-green-500" : diff > 0 ? "text-red-400" : "text-slate-400";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-500">
          {lang === "he" ? "התחלה" : "Start"}: <strong className="text-slate-700">{first} {kg}</strong>
        </span>
        <span className={`font-semibold ${diffColor}`}>{diffText}</span>
        <span className="text-slate-500">
          {lang === "he" ? "עכשיו" : "Now"}: <strong className="text-slate-700">{last} {kg}</strong>
        </span>
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[minW, maxW]}
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value) => [`${value} ${kg}`, lang === "he" ? "משקל" : "Weight"]}
            labelFormatter={(label) => label}
            contentStyle={{
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              fontSize: "12px",
            }}
          />
          {targetDisplay != null && (
            <ReferenceLine
              y={targetDisplay}
              stroke="#0ea5e9"
              strokeDasharray="4 4"
              label={{ value: `${lang === "he" ? "יעד" : "Target"} ${targetDisplay}`, fontSize: 10, fill: "#0ea5e9", position: "right" }}
            />
          )}
          <Line
            type="monotone"
            dataKey="weight"
            stroke="#0ea5e9"
            strokeWidth={2.5}
            dot={{ fill: "#0ea5e9", r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
