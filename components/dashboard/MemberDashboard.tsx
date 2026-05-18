"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { MealCard } from "@/components/meals/MealCard";
import { getTodayCheckin, addEncouragement } from "@/lib/firebase/firestore";
import { format } from "date-fns";
import toast from "react-hot-toast";
import type { DailyCheckin, Encouragement, Meal } from "@/types";

const moods = [
  { value: 1, emoji: "😞" },
  { value: 2, emoji: "😕" },
  { value: 3, emoji: "😐" },
  { value: 4, emoji: "🙂" },
  { value: 5, emoji: "😄" },
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
        const enc: Encouragement = {
          authorId: currentUserId,
          authorName: currentUserName,
          text,
          createdAt: Date.now(),
        };
        await addEncouragement(wingId, checkin.id, enc);
        setCheckin((prev) =>
          prev ? { ...prev, encouragements: [...(prev.encouragements ?? []), enc] } : prev
        );
        await fetch("/api/notifications/encouragement", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetUserId: memberId, authorName: currentUserName, message: text }),
        });
      }
      setEncText("");
      toast.success(isOwn ? "תגובה נשלחה! 💬" : "העידוד נשלח! 💪");
    } catch {
      toast.error("שגיאה בשליחה");
    } finally {
      setSending(false);
    }
  }

  const memberMeals = todayMeals.filter((m) => m.userId === memberId);

  return (
    <div className="space-y-4">
      {/* Check-in summary */}
      {checkin === undefined ? (
        <div className="h-28 bg-slate-100 rounded-3xl animate-pulse" />
      ) : checkin === null ? (
        <Card>
          <p className="text-center text-slate-400 py-4 text-sm">
            {memberName} עדיין לא ביצע/ה צ&apos;ק-אין היום
          </p>
        </Card>
      ) : (
        <Card>
          <h3 className="font-semibold text-slate-800 mb-3">הצ&apos;ק-אין של היום</h3>
          <div className="flex flex-wrap gap-2 mb-3">
            <span className="bg-blue-50 text-blue-600 text-xs px-3 py-1.5 rounded-xl font-medium">
              💧 {checkin.waterGlasses.toFixed(1)}L מים
            </span>
            <span className="bg-green-50 text-green-600 text-xs px-3 py-1.5 rounded-xl font-medium">
              🥦 {checkin.vegetablesServings} ירקות
            </span>
            {checkin.steps ? (
              <span className="bg-orange-50 text-orange-600 text-xs px-3 py-1.5 rounded-xl font-medium">
                👟 {checkin.steps.toLocaleString()} צעדים
              </span>
            ) : null}
            {checkin.workout?.done && (
              <span className="bg-purple-50 text-purple-600 text-xs px-3 py-1.5 rounded-xl font-medium">
                🏋️ אימון
              </span>
            )}
            {checkin.weightKg ? (
              <span className="bg-slate-100 text-slate-600 text-xs px-3 py-1.5 rounded-xl font-medium">
                ⚖️ {checkin.weightKg} ק&quot;ג
              </span>
            ) : null}
            <span className="bg-wing-soft text-wing-primary text-xs px-3 py-1.5 rounded-xl font-medium">
              {moods.find((m) => m.value === checkin.mood)?.emoji} מצב רוח
            </span>
          </div>

          {checkin.workout?.done && checkin.workout.description && (
            <p className="text-xs text-slate-600 bg-purple-50 rounded-xl px-3 py-2 mb-3">
              🏋️ {checkin.workout.description}
              {checkin.workout.caloriesBurned ? ` · ${checkin.workout.caloriesBurned} קק"ל` : ""}
            </p>
          )}

          {checkin.notes && (
            <p className="text-xs text-slate-500 bg-slate-50 rounded-xl px-3 py-2 italic mb-3">
              &ldquo;{checkin.notes}&rdquo;
            </p>
          )}

          {/* Encouragements */}
          {(checkin.encouragements ?? []).length > 0 && (
            <div className="space-y-2 mb-3">
              {checkin.encouragements!.map((enc, i) => (
                <div key={i} className="text-sm bg-wing-soft rounded-xl px-3 py-2">
                  <span className="font-medium text-wing-primary">{enc.authorName}: </span>
                  <span className="text-slate-600">{enc.text}</span>
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
              placeholder={isOwn ? "הגב על הצ'ק-אין שלך..." : `עודד את ${memberName}...`}
              className="flex-1 text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-wing-primary bg-slate-50"
              onKeyDown={(e) => { if (e.key === "Enter") handleSendEncouragement(); }}
            />
            <Button size="sm" onClick={handleSendEncouragement} loading={sending} disabled={!encText.trim()}>
              שלח
            </Button>
          </div>
        </Card>
      )}

      {/* Today's meals */}
      {memberMeals.length > 0 ? (
        <div className="space-y-3">
          <h3 className="font-semibold text-slate-700">ארוחות היום</h3>
          {memberMeals.map((meal) => (
            <MealCard
              key={meal.id}
              meal={meal}
              currentUserId={currentUserId}
              currentUserName={currentUserName}
            />
          ))}
        </div>
      ) : (
        <Card>
          <p className="text-center text-slate-400 py-4 text-sm">
            אין ארוחות מתועדות היום
          </p>
        </Card>
      )}
    </div>
  );
}
