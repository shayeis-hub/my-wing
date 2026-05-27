"use client";

import { useState } from "react";
import { Heart, Flame, Sparkles, Trophy } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import type { Reaction, ReactionType } from "@/types";

interface ReactionsProps {
  reactions: Reaction[];
  currentUserId: string;
  onToggle: (type: ReactionType) => Promise<void> | void;
  size?: "sm" | "md";
}

const reactionConfig: { type: ReactionType; Icon: typeof Heart; color: string; bg: string }[] = [
  { type: "heart",    Icon: Heart,    color: "#e83a3a", bg: "#fff0eb" },
  { type: "flame",    Icon: Flame,    color: "#d4541a", bg: "#fff3b8" },
  { type: "sparkles", Icon: Sparkles, color: "#c79a00", bg: "#fff8e0" },
  { type: "trophy",   Icon: Trophy,   color: "#2f8d5f", bg: "#eaf5ef" },
];

export function Reactions({ reactions, currentUserId, onToggle, size = "sm" }: ReactionsProps) {
  const { t } = useLanguage();
  const [pending, setPending] = useState<ReactionType | null>(null);
  const [hoverDetails, setHoverDetails] = useState<ReactionType | null>(null);

  const grouped: Record<ReactionType, Reaction[]> = {
    heart: [], flame: [], sparkles: [], trophy: [],
  };
  reactions.forEach((r) => { grouped[r.type]?.push(r); });

  const iconSize = size === "md" ? 14 : 12;
  const padding  = size === "md" ? "px-2.5 py-1" : "px-2 py-0.5";
  const text     = size === "md" ? "text-xs" : "text-[11px]";

  async function handleToggle(type: ReactionType) {
    if (pending) return;
    setPending(type);
    try {
      await onToggle(type);
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {reactionConfig.map(({ type, Icon, color, bg }) => {
        const count = grouped[type].length;
        const mineReacted = grouped[type].some((r) => r.userId === currentUserId);
        const isPending = pending === type;
        const showDetails = hoverDetails === type && count > 0;

        return (
          <div key={type} className="relative">
            <button
              onClick={() => handleToggle(type)}
              onMouseEnter={() => setHoverDetails(type)}
              onMouseLeave={() => setHoverDetails(null)}
              disabled={isPending}
              aria-label={t(`reaction_${type}` as never) as string}
              className={`${padding} rounded-full border flex items-center gap-1 transition-all active:scale-95 ${
                mineReacted
                  ? "border-transparent shadow-sm"
                  : "bg-wing-elevated border-wing-border hover:border-wing-ink"
              } ${isPending ? "opacity-60" : ""}`}
              style={mineReacted ? { background: bg, borderColor: color } : {}}
            >
              <Icon
                size={iconSize}
                strokeWidth={mineReacted ? 2.5 : 2}
                style={{ color: mineReacted ? color : "var(--wing-muted, #8a7e6a)" }}
                fill={mineReacted ? color : "none"}
              />
              {count > 0 && (
                <span
                  className={`${text} font-bold tabular`}
                  style={{ color: mineReacted ? color : "var(--wing-ink, #1a1814)" }}
                >
                  {count}
                </span>
              )}
            </button>
            {showDetails && (
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 z-10 bg-wing-ink text-wing-elevated text-[10px] rounded-lg px-2 py-1 whitespace-nowrap font-medium shadow-lg pointer-events-none">
                {grouped[type].map((r) => r.userName.split(" ")[0]).join(", ")}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
