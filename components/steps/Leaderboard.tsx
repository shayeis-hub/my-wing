import { Trophy } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { StepsEntry } from "@/types";

interface LeaderboardProps {
  entries: StepsEntry[];
  currentUserId: string;
}

const medals = ["🥇", "🥈", "🥉"];

export function Leaderboard({ entries, currentUserId }: LeaderboardProps) {
  const sorted = [...entries].sort((a, b) => b.steps - a.steps);

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <Trophy size={20} className="text-yellow-400" />
        <h3 className="font-semibold text-slate-800">לוח תוצאות היום</h3>
      </div>
      <div className="space-y-3">
        {sorted.map((entry, i) => (
          <div
            key={entry.userId}
            className={`flex items-center justify-between p-3 rounded-2xl ${
              entry.userId === currentUserId
                ? "bg-wing-soft border border-wing-accent"
                : "bg-slate-50"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg w-7 text-center">
                {i < 3 ? medals[i] : `${i + 1}.`}
              </span>
              <span className={`font-medium text-sm ${
                entry.userId === currentUserId ? "text-wing-primary" : "text-slate-700"
              }`}>
                {entry.userName}
              </span>
            </div>
            <span className="font-bold text-slate-800 tabular-nums">
              {entry.steps.toLocaleString()}
              <span className="text-xs text-slate-400 font-normal mr-1">צעדים</span>
            </span>
          </div>
        ))}
        {sorted.length === 0 && (
          <p className="text-center text-slate-400 py-4 text-sm">
            עדיין אין נתוני צעדים להיום
          </p>
        )}
      </div>
    </Card>
  );
}
