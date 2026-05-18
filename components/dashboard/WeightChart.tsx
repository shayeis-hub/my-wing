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
import { he } from "date-fns/locale";
import type { WeightLog } from "@/types";

interface WeightChartProps {
  logs: WeightLog[];
  targetWeight?: number;
}

export function WeightChart({ logs, targetWeight }: WeightChartProps) {
  if (logs.length === 0) {
    return (
      <p className="text-sm text-slate-400 text-center py-4">
        עדיין אין נתוני משקל — עדכן משקל בצ&apos;ק-אין היומי
      </p>
    );
  }

  const data = logs.map((l) => ({
    date: l.date,
    label: format(parseISO(l.date), "d/M", { locale: he }),
    weight: l.weightKg,
  }));

  const weights = data.map((d) => d.weight);
  const minW = Math.min(...weights) - 1;
  const maxW = Math.max(...weights) + 1;
  const first = data[0].weight;
  const last = data[data.length - 1].weight;
  const diff = +(last - first).toFixed(1);
  const diffText = diff < 0 ? `${diff} ק"ג` : diff > 0 ? `+${diff} ק"ג` : "ללא שינוי";
  const diffColor = diff < 0 ? "text-green-500" : diff > 0 ? "text-red-400" : "text-slate-400";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-500">
          התחלה: <strong className="text-slate-700">{first} ק&quot;ג</strong>
        </span>
        <span className={`font-semibold ${diffColor}`}>{diffText}</span>
        <span className="text-slate-500">
          עכשיו: <strong className="text-slate-700">{last} ק&quot;ג</strong>
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
            formatter={(value) => [`${value} ק"ג`, "משקל"]}
            labelFormatter={(label) => label}
            contentStyle={{
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              fontSize: "12px",
            }}
          />
          {targetWeight && (
            <ReferenceLine
              y={targetWeight}
              stroke="#0ea5e9"
              strokeDasharray="4 4"
              label={{ value: `יעד ${targetWeight}`, fontSize: 10, fill: "#0ea5e9", position: "right" }}
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
