"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, UtensilsCrossed, ClipboardCheck, Megaphone } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { he, enUS } from "date-fns/locale";
import {
  getRecentEncouragementsForUser,
  toggleEncouragementReaction,
  type RecentEncouragement,
} from "@/lib/firebase/firestore";
import { Reactions } from "@/components/ui/Reactions";
import { useLanguage } from "@/lib/i18n";
import type { ReactionType } from "@/types";

interface RecentActivityProps {
  wingId: string;
  userId: string;
  userName: string;
}

const TYPE_ICONS = {
  checkin: ClipboardCheck,
  meal: UtensilsCrossed,
  post: Megaphone,
};

const TYPE_LABEL_KEYS = {
  checkin: "recent_activity_checkin",
  meal: "recent_activity_meal",
  post: "recent_activity_post",
} as const;

export function RecentActivity({ wingId, userId, userName }: RecentActivityProps) {
  const { t, lang } = useLanguage();
  const router = useRouter();
  const [items, setItems] = useState<RecentEncouragement[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getRecentEncouragementsForUser(wingId, userId, 7)
      .then((list) => { if (!cancelled) setItems(list); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [wingId, userId]);

  if (loading || items.length === 0) return null;

  const shown = expanded ? items : items.slice(0, 3);
  const dateLocale = lang === "he" ? he : enUS;

  async function handleReaction(item: RecentEncouragement, type: ReactionType) {
    const fieldName = item.type === "checkin" ? "encouragements" : "comments";
    const reaction = { userId, userName, type, createdAt: Date.now() };
    const newReactions = await toggleEncouragementReaction(
      wingId, item.type, item.parentDocId, item.encKey, reaction, fieldName
    );
    setItems((prev) =>
      prev.map((i) =>
        i.encKey === item.encKey && i.parentDocId === item.parentDocId
          ? { ...i, reactions: newReactions }
          : i
      )
    );
  }

  return (
    <div className="bg-wing-surface border border-wing-border rounded-[20px] p-4 space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <MessageCircle size={16} className="text-wing-heat" strokeWidth={2.5} />
        <h3 className="font-bold text-wing-ink text-sm">
          {t("recent_activity_title") as string}
        </h3>
        <span className="text-xs text-wing-muted mr-auto">{items.length}</span>
      </div>

      <div className="space-y-1.5">
        {shown.map((item, i) => {
          const Icon = TYPE_ICONS[item.type];
          const typeLabel = t(TYPE_LABEL_KEYS[item.type]) as string;
          const timeAgo = formatDistanceToNow(new Date(item.createdAt), {
            addSuffix: true,
            locale: dateLocale,
          });
          return (
            <div
              key={`${item.type}-${item.createdAt}-${i}`}
              className="bg-wing-elevated border border-wing-border rounded-xl px-3 py-2.5 space-y-2"
            >
              {/* Header row — clickable to navigate */}
              <button
                className="w-full text-start flex items-start gap-2.5 group"
                onClick={() => router.push(item.link)}
              >
                <Icon size={14} className="text-wing-muted mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    <span className="font-bold text-wing-ink text-sm">{item.authorName}</span>
                    <span className="text-[11px] text-wing-muted">· {typeLabel}</span>
                    <span className="text-[11px] text-wing-muted mr-auto">{timeAgo}</span>
                  </div>
                  <p className="text-sm text-wing-ink/80 leading-snug">{item.text}</p>
                </div>
              </button>

              {/* Reactions row */}
              <div className="mr-[22px]">
                <Reactions
                  reactions={item.reactions ?? []}
                  currentUserId={userId}
                  onToggle={(type) => handleReaction(item, type)}
                  size="sm"
                />
              </div>
            </div>
          );
        })}
      </div>

      {items.length > 3 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full text-xs text-wing-muted hover:text-wing-ink py-1"
        >
          {expanded
            ? (t("recent_activity_collapse") as string)
            : (t("recent_activity_show_all") as (n: number) => string)(items.length - 3)}
        </button>
      )}
    </div>
  );
}
