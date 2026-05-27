"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { he, enUS } from "date-fns/locale";
import { Activity } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useWing } from "@/hooks/useWing";
import { useMeals } from "@/hooks/useMeals";
import { useLanguage } from "@/lib/i18n";
import {
  createDailyPrompt,
  getTodayPrompt,
  getWingCheckins,
  getRecentPrompts,
} from "@/lib/firebase/firestore";
import { getPromptForDate } from "@/lib/dailyPrompts";
import { DailyPromptCard } from "@/components/feed/DailyPromptCard";
import { MealCard } from "@/components/meals/MealCard";
import { Avatar } from "@/components/ui/Avatar";
import { Reactions } from "@/components/ui/Reactions";
import { toggleCheckinReaction } from "@/lib/firebase/firestore";
import type { DailyPrompt, DailyCheckin, Meal, ReactionType } from "@/types";

type FeedItem =
  | { kind: "prompt"; date: string; data: DailyPrompt; ts: number }
  | { kind: "meal"; date: string; data: Meal; ts: number }
  | { kind: "checkin"; date: string; data: DailyCheckin; ts: number };

export default function FeedPage() {
  const { user, firebaseUser } = useAuth();
  const { wing } = useWing(user?.wingId);
  const { meals } = useMeals(user?.wingId);
  const { t, lang } = useLanguage();

  const [todayPrompt, setTodayPrompt] = useState<DailyPrompt | null>(null);
  const [recentPrompts, setRecentPrompts] = useState<DailyPrompt[]>([]);
  const [recentCheckins, setRecentCheckins] = useState<DailyCheckin[]>([]);
  const [loading, setLoading] = useState(true);

  const today = format(new Date(), "yyyy-MM-dd");

  // Lazy-create today's prompt if missing
  useEffect(() => {
    if (!user?.wingId || !firebaseUser) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const existing = await getTodayPrompt(user.wingId!, today);
        if (existing) {
          if (!cancelled) setTodayPrompt(existing);
        } else {
          const { question, questionId } = getPromptForDate(new Date(), lang);
          const created = await createDailyPrompt(user.wingId!, today, question, questionId);
          if (!cancelled) setTodayPrompt(created);
        }

        const [prompts, ...checkinDays] = await Promise.all([
          getRecentPrompts(user.wingId!, 14),
          ...Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return getWingCheckins(user.wingId!, format(d, "yyyy-MM-dd"));
          }),
        ]);
        if (cancelled) return;
        setRecentPrompts(prompts.filter((p) => p.date !== today));
        setRecentCheckins(checkinDays.flat());
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.wingId, firebaseUser, today, lang]);

  // Build the feed: today's prompt at top, then a chronological mix of meals + checkins + older prompts
  const feedItems: FeedItem[] = useMemo(() => {
    const items: FeedItem[] = [];

    meals.forEach((m) => {
      const d = m.mealDate ?? (m.createdAt?.toDate ? format(m.createdAt.toDate(), "yyyy-MM-dd") : today);
      const ts = m.createdAt?.toDate ? m.createdAt.toDate().getTime() : Date.now();
      items.push({ kind: "meal", date: d, data: m, ts });
    });

    recentCheckins.forEach((c) => {
      const ts = c.createdAt?.toDate ? c.createdAt.toDate().getTime() : Date.now();
      items.push({ kind: "checkin", date: c.date, data: c, ts });
    });

    recentPrompts.forEach((p) => {
      const ts = p.createdAt?.toDate ? p.createdAt.toDate().getTime() : 0;
      items.push({ kind: "prompt", date: p.date, data: p, ts });
    });

    return items.sort((a, b) => b.ts - a.ts).slice(0, 60);
  }, [meals, recentCheckins, recentPrompts, today]);

  function dateLabel(dateStr: string): string {
    if (dateStr === today) return t("feed_today") as string;
    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    if (dateStr === format(yest, "yyyy-MM-dd")) return t("feed_yesterday") as string;
    return format(new Date(dateStr + "T12:00:00"), "EEEE d MMMM", { locale: lang === "he" ? he : enUS });
  }

  // Group by date label, but only insert headers between distinct dates
  let lastDateLabel = "";

  return (
    <div className="p-4 space-y-4">
      <div className="pt-4 flex items-center gap-2">
        <Activity size={22} className="text-wing-heat" strokeWidth={2.5} />
        <h1 className="text-2xl font-black text-wing-ink tracking-tight">{t("feed_title") as string}</h1>
      </div>

      {/* Today's prompt — always at top */}
      {todayPrompt && firebaseUser && user && wing && (
        <DailyPromptCard
          prompt={todayPrompt}
          wingId={user.wingId!}
          currentUserId={firebaseUser.uid}
          currentUserName={user.displayName}
          members={wing.members}
          onResponseAdded={(next) => setTodayPrompt((p) => p ? { ...p, responses: next } : p)}
          onReactionsChanged={(next) => setTodayPrompt((p) => p ? { ...p, reactions: next } : p)}
        />
      )}

      {loading && !todayPrompt && (
        <p className="text-center text-sm text-wing-muted py-12 animate-pulse">{t("feed_loading") as string}</p>
      )}

      {!loading && feedItems.length === 0 && !todayPrompt && (
        <p className="text-center text-sm text-wing-muted py-12">{t("feed_empty") as string}</p>
      )}

      {feedItems.map((item, i) => {
        const label = dateLabel(item.date);
        const showHeader = label !== lastDateLabel;
        lastDateLabel = label;
        return (
          <div key={`${item.kind}-${item.data.id}-${i}`} className="space-y-3">
            {showHeader && (
              <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-wing-muted mt-4 mb-1">
                {label}
              </p>
            )}
            {item.kind === "meal" && firebaseUser && (
              <MealCard
                meal={item.data}
                currentUserId={firebaseUser.uid}
                currentUserName={user?.displayName}
              />
            )}
            {item.kind === "checkin" && firebaseUser && user && wing && (
              <CheckinFeedCard
                checkin={item.data}
                wingId={user.wingId!}
                currentUserId={firebaseUser.uid}
                currentUserName={user.displayName}
                photoURL={wing.members.find((m) => m.uid === item.data.userId)?.photoURL}
                onReactionsChanged={(next) => setRecentCheckins((prev) => prev.map((c) => c.id === item.data.id ? { ...c, reactions: next } : c))}
              />
            )}
            {item.kind === "prompt" && firebaseUser && user && wing && (
              <DailyPromptCard
                prompt={item.data}
                wingId={user.wingId!}
                currentUserId={firebaseUser.uid}
                currentUserName={user.displayName}
                members={wing.members}
                onResponseAdded={(next) => setRecentPrompts((prev) => prev.map((p) => p.id === item.data.id ? { ...p, responses: next } : p))}
                onReactionsChanged={(next) => setRecentPrompts((prev) => prev.map((p) => p.id === item.data.id ? { ...p, reactions: next } : p))}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

interface CheckinFeedCardProps {
  checkin: DailyCheckin;
  wingId: string;
  currentUserId: string;
  currentUserName: string;
  photoURL?: string;
  onReactionsChanged: (next: import("@/types").Reaction[]) => void;
}

function CheckinFeedCard({ checkin, wingId, currentUserId, currentUserName, photoURL, onReactionsChanged }: CheckinFeedCardProps) {
  const { t } = useLanguage();
  const isMine = checkin.userId === currentUserId;
  const moodEmoji = ["😞", "😕", "😐", "😊", "🤩"][checkin.mood - 1] ?? "😐";

  async function handleReaction(type: ReactionType) {
    if (isMine) return;
    const next = await toggleCheckinReaction(wingId, checkin.id, checkin.reactions, currentUserId, currentUserName, type);
    onReactionsChanged(next);
  }

  return (
    <div className="bg-wing-surface border border-wing-border rounded-[20px] p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Avatar name={checkin.userName} photoURL={photoURL} size={36} isCurrentUser={isMine} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-wing-ink">{checkin.userName.split(" ")[0]}</p>
          <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-wing-muted">
            {t("feed_checkin_label") as string}
          </p>
        </div>
        <span className="text-2xl" aria-label="mood">{moodEmoji}</span>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {checkin.waterGlasses > 0 && (
          <span className="bg-wing-elevated border border-wing-border rounded-full px-2.5 py-1 text-wing-ink font-medium">
            {checkin.waterGlasses.toFixed(2).replace(/\.?0+$/, "")}L {t("water_label") as string}
          </span>
        )}
        {checkin.vegetablesServings > 0 && (
          <span className="bg-wing-elevated border border-wing-border rounded-full px-2.5 py-1 text-wing-ink font-medium">
            {checkin.vegetablesServings} {t("dashboard_mini_veggies") as string}
          </span>
        )}
        {checkin.steps && (
          <span className="bg-wing-elevated border border-wing-border rounded-full px-2.5 py-1 text-wing-ink font-medium">
            {checkin.steps.toLocaleString()} {t("steps_label") as string}
          </span>
        )}
        {checkin.workout?.done && (
          <span className="bg-wing-elevated border border-wing-border rounded-full px-2.5 py-1 text-wing-ink font-medium">
            {checkin.workout.description ?? t("checkin_workout") as string}
          </span>
        )}
        {checkin.weightKg && (
          <span className="bg-wing-elevated border border-wing-border rounded-full px-2.5 py-1 text-wing-ink font-medium">
            {checkin.weightKg} {t("checkin_weight_unit") as string}
          </span>
        )}
      </div>

      {checkin.notes && (
        <p className="text-sm text-wing-ink/80 italic bg-wing-elevated/60 rounded-[12px] px-3 py-2">
          &ldquo;{checkin.notes}&rdquo;
        </p>
      )}

      {!isMine && (
        <Reactions
          reactions={checkin.reactions ?? []}
          currentUserId={currentUserId}
          onToggle={handleReaction}
        />
      )}
      {isMine && (checkin.reactions ?? []).length > 0 && (
        <Reactions
          reactions={checkin.reactions ?? []}
          currentUserId={currentUserId}
          onToggle={async () => {/* own */}}
        />
      )}
    </div>
  );
}
