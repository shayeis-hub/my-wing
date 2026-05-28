"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle, UtensilsCrossed, ClipboardCheck, Megaphone, ChevronLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { he, enUS } from "date-fns/locale";
import { getRecentEncouragementsForUser, type RecentEncouragement } from "@/lib/firebase/firestore";
import { useLanguage } from "@/lib/i18n";

interface RecentActivityProps {
  wingId: string;
  userId: string;
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

export function RecentActivity({ wingId, userId }: RecentActivityProps) {
  const { t, lang } = useLanguage();
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
            <Link
              key={`${item.type}-${item.createdAt}-${i}`}
              href={item.link}
              className="flex items-start gap-2.5 bg-wing-elevated border border-wing-border rounded-xl px-3 py-2 hover:border-wing-ink transition-colors group"
            >
              <Icon size={14} className="text-wing-muted mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span className="font-bold text-wing-ink text-sm">{item.authorName}</span>
                  <span className="text-[11px] text-wing-muted">· {typeLabel}</span>
                  <span className="text-[11px] text-wing-muted mr-auto">{timeAgo}</span>
                </div>
                <p className="text-sm text-wing-ink/80 leading-snug truncate">{item.text}</p>
              </div>
              <ChevronLeft size={14} className="text-wing-subtle group-hover:text-wing-ink transition-colors flex-shrink-0 mt-1" />
            </Link>
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
