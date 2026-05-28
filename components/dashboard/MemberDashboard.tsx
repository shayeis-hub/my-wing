"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { MealCard } from "@/components/meals/MealCard";
import { getTodayCheckin, addEncouragement } from "@/lib/firebase/firestore";
import { format } from "date-fns";
import toast from "react-hot-toast";
import type { DailyCheckin, Encouragement, Meal } from "@/types";
import { Droplets, Leaf, Footprints, Dumbbell, Scale, Smile } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

const moods = [
  { value: 1, emoji: "😞" },
  { value: 2, emoji: "😕" },
  { value: 3, emoji: "😐" },
  { value: 4, emoji: "😊" },
  { value: 5, emoji: "🤩" },
];

interface MemberDashboardProps {
  memberId: string;
  memberName: string;
  wingId: string;
  currentUserId: string;
  currentUserName: string;
  todayMeals: Meal[];
}

export function MemberDashboard({
  memberId,
  memberName,
  wingId,
  currentUserId,
  currentUserName,
  todayMeals,
}: MemberDashboardProps) {
  const [checkin, setCheckin] = useState<DailyCheckin | null | undefined>(undefined);
  const [encText, setEncText] = useState("");
  const [sending, setSending] = useState(false);
  const { t } = useLanguage();
  const today = format(new Date(), "yyyy-MM-dd");
  const isOwn = memberId === currentUserId;

  useEffect(() => {
    setCheckin(undefined);
    setEncText("");
    getTodayCheckin(wingId, memberId, today).then(setCheckin);
  }, [wingId, memberId, today]);

  async function handleSendEncouragement() {
    const text = encText.trim();
    if (!text) return;
    setSending(true);
    try {
      if (checkin) {
        const enc: Encouragement = { authorId: currentUserId, authorName: currentUserName, text, createdAt: Date.now() };
        await addEncouragement(wingId, checkin.id, enc);
        setCheckin((prev) => prev ? { ...prev, encouragements: [...(prev.encouragements ?? []), enc] } : prev);
        await fetch("/api/notifications/encouragement", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetUserId: memberId,
            authorName: currentUserName,
            message: text,
            link: `/checkin?date=${checkin.date}`,
          }),
        });
      }
      setEncText("");
      toast.success(isOwn ? t("member_reply_sent") : t("enc_sent"));
    } catch {
      toast.error(t("enc_error"));
    } finally {
      setSending(false);
    }
  }

  const memberMeals = todayMeals.filter((m) => m.userId === memberId);

  return (
    <div className="space-y-4">
      {/* Checkin card */}
      {checkin === undefined ? (
        <div className="h-36 bg-wing-elevated border border-wing-border rounded-[20px] animate-pulse" />
      ) : checkin === null ? (
        <div className="bg-wing-surface border border-wing-border rounded-[20px] p-6 text-center">
          <p className="text-wing-muted text-sm">{(t("member_no_checkin") as (name: string) => string)(memberName.split(" ")[0])}</p>
        </div>
      ) : (
        <div className="bg-wing-surface border border-wing-border rounded-[20px] p-4 space-y-4">

          {/* Stats grid */}
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-wing-elevated border border-wing-border rounded-2xl p-3 text-center">
              <Droplets size={15} className="mx-auto text-blue-400 mb-1" />
              <p className="font-black text-wing-ink tabular text-base" style={{ letterSpacing: "-0.03em" }}>
                {checkin.waterGlasses.toFixed(1)}
              </p>
              <p className="font-mono text-[11px] text-wing-muted uppercase tracking-wider">{t("liters_label")}</p>
            </div>
            <div className="bg-wing-elevated border border-wing-border rounded-2xl p-3 text-center">
              <Leaf size={15} className="mx-auto text-green-500 mb-1" />
              <p className="font-black text-wing-ink tabular text-base" style={{ letterSpacing: "-0.03em" }}>
                {checkin.vegetablesServings}
              </p>
              <p className="font-mono text-[11px] text-wing-muted uppercase tracking-wider">{t("veg_label")}</p>
            </div>
            <div className="bg-wing-elevated border border-wing-border rounded-2xl p-3 text-center">
              <Footprints size={15} className="mx-auto text-wing-muted mb-1" />
              <p className="font-black text-wing-ink tabular text-base" style={{ letterSpacing: "-0.03em" }}>
                {checkin.steps
                  ? checkin.steps >= 1000 ? `${(checkin.steps / 1000).toFixed(1)}k` : checkin.steps
                  : "—"}
              </p>
              <p className="font-mono text-[11px] text-wing-muted uppercase tracking-wider">{t("steps_label")}</p>
            </div>
            <div className="bg-wing-elevated border border-wing-border rounded-2xl p-3 text-center">
              <Smile size={15} className="mx-auto text-[#c79a00] mb-1" />
              <p className="text-lg leading-none mt-0.5">
                {moods.find((m) => m.value === checkin.mood)?.emoji ?? "😐"}
              </p>
              <p className="font-mono text-[11px] text-wing-muted uppercase tracking-wider mt-1">{t("mood_label")}</p>
            </div>
          </div>

          {/* Weight */}
          {checkin.weightKg && (
            <div className="flex items-center gap-2 bg-wing-elevated border border-wing-border rounded-2xl px-4 py-2.5">
              <Scale size={14} className="text-wing-muted" />
              <span className="text-sm text-wing-muted">{t("weight_label")}:</span>
              <span className="font-bold text-wing-ink">{checkin.weightKg} {t("kg_label")}</span>
            </div>
          )}

          {/* Workout */}
          {checkin.workout?.done && (
            <div className="bg-wing-elevated border border-wing-border rounded-2xl px-4 py-3 flex items-start gap-2">
              <Dumbbell size={14} className="text-wing-muted mt-0.5 shrink-0" />
              <div>
                <span className="text-sm font-semibold text-wing-ink">{t("workout_label")}</span>
                {checkin.workout.description && (
                  <p className="text-xs text-wing-muted mt-0.5">
                    {checkin.workout.description}
                    {checkin.workout.caloriesBurned ? ` · ${checkin.workout.caloriesBurned} ${t("kcal")}` : ""}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {checkin.notes && (
            <p className="text-sm text-wing-muted bg-wing-elevated border border-wing-border rounded-2xl px-4 py-3 italic">
              &ldquo;{checkin.notes}&rdquo;
            </p>
          )}

          {/* Encouragements */}
          {(checkin.encouragements ?? []).length > 0 && (
            <div className="space-y-2">
              {checkin.encouragements!.map((enc, i) => (
                <div key={i} className="text-sm bg-wing-elevated border border-wing-border rounded-2xl px-3 py-2">
                  <span className="font-bold text-wing-ink">{enc.authorName}: </span>
                  <span className="text-wing-muted">{enc.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* Encouragement input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={encText}
              onChange={(e) => setEncText(e.target.value)}
              placeholder={isOwn ? t("member_reply_ph") : (t("checkin_encourage_ph") as (name: string) => string)(memberName.split(" ")[0])}
              className="flex-1 text-sm border border-wing-border rounded-2xl px-3 py-2.5 bg-wing-elevated focus:outline-none focus:ring-2 focus:ring-wing-ink text-wing-ink placeholder:text-wing-subtle"
              onKeyDown={(e) => { if (e.key === "Enter") handleSendEncouragement(); }}
            />
            <Button size="sm" onClick={handleSendEncouragement} loading={sending} disabled={!encText.trim()}>
              {t("send")}
            </Button>
          </div>
        </div>
      )}

      {/* Today's meals */}
      {memberMeals.length > 0 ? (
        <div className="space-y-3">
          <h3 className="font-bold text-wing-ink">{t("member_meals_today")}</h3>
          {memberMeals.map((meal) => (
            <MealCard key={meal.id} meal={meal} currentUserId={currentUserId} currentUserName={currentUserName} />
          ))}
        </div>
      ) : (
        <div className="bg-wing-surface border border-wing-border rounded-[20px] p-5 text-center">
          <p className="text-wing-muted text-sm">{t("dashboard_no_meals")}</p>
        </div>
      )}
    </div>
  );
}
