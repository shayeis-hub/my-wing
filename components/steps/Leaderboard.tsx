import { Trophy } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { useLanguage } from "@/lib/i18n";
import type { StepsEntry, WingMember } from "@/types";

interface LeaderboardProps {
  entries: StepsEntry[];
  currentUserId: string;
  members?: WingMember[];
}

const medals = ["🥇", "🥈", "🥉"];

export function Leaderboard({ entries, currentUserId, members = [] }: LeaderboardProps) {
  const { t, lang } = useLanguage();
  const sorted = [...entries].sort((a, b) => b.steps - a.steps);
  const memberMap = Object.fromEntries(members.map((m) => [m.uid, m]));

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <Trophy size={18} className="text-[#c79a00]" />
        <h3 className="font-bold text-wing-ink">{t("leaderboard_title") as string}</h3>
      </div>
      <div className="space-y-1">
        {sorted.map((entry, i) => {
          const isMe = entry.userId === currentUserId;
          return (
            <div
              key={entry.userId}
              className="flex items-center justify-between py-2.5 px-1 rounded-xl transition-all"
              style={
                isMe
                  ? {
                      background: "linear-gradient(90deg, transparent, rgba(245,221,75,0.12), transparent)",
                      marginInline: "-4px",
                      paddingInline: "8px",
                    }
                  : {}
              }
            >
              <div className="flex items-center gap-3">
                <span className="text-base w-7 text-center font-mono">
                  {i < 3 ? medals[i] : <span className="text-xs text-wing-muted">{i + 1}</span>}
                </span>
                <Avatar
                  name={entry.userName}
                  photoURL={memberMap[entry.userId]?.photoURL}
                  size={34}
                  isCurrentUser={isMe}
                  showYouBadge={isMe}
                />
                <span className={`text-sm font-medium ${isMe ? "text-wing-ink font-bold" : "text-slate-700"}`}>
                  {isMe ? t("leaderboard_me") as string : entry.userName.split(" ")[0]}
                </span>
              </div>
              <div dir={lang === "he" ? "rtl" : "ltr"}>
                <span className="font-black text-sm text-wing-ink tabular" style={{ letterSpacing: "-0.03em" }}>
                  {entry.steps.toLocaleString()}
                </span>
                <span className="text-sm text-wing-muted font-mono ms-1">{t("leaderboard_unit") as string}</span>
              </div>
            </div>
          );
        })}
        {sorted.length === 0 && (
          <p className="text-center text-wing-subtle py-6 text-sm">{t("leaderboard_empty") as string}</p>
        )}
      </div>
    </Card>
  );
}
