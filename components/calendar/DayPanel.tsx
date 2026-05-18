"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { he } from "date-fns/locale";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { addEncouragement } from "@/lib/firebase/firestore";
import type { DailyCheckin, Encouragement, WingMember } from "@/types";
import toast from "react-hot-toast";

const moods = [
  { value: 1, emoji: "😞" },
  { value: 2, emoji: "😕" },
  { value: 3, emoji: "😐" },
  { value: 4, emoji: "🙂" },
  { value: 5, emoji: "😄" },
];

interface DayPanelProps {
  date: string;
  checkins: DailyCheckin[];
  members: WingMember[];
  wingId: string;
  currentUserId: string;
  currentUserName: string;
  onPrevDay: () => void;
  onNextDay: () => void;
  canGoNext: boolean;
  onEncouragementSent: (checkinId: string, enc: Encouragement) => void;
}

export function DayPanel({
  date,
  checkins,
  members,
  wingId,
  currentUserId,
  currentUserName,
  onPrevDay,
  onNextDay,
  canGoNext,
  onEncouragementSent,
}: DayPanelProps) {
  const [selectedMemberId, setSelectedMemberId] = useState<string>(
    () => members.find((m) => m.uid === currentUserId)?.uid ?? members[0]?.uid ?? currentUserId
  );
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<string | null>(null);

  const dateFormatted = format(parseISO(date), "EEEE, d MMMM", { locale: he });

  // Self member: match by UID first, fallback to display name (handles legacy UID mismatch)
  const selfMember =
    members.find((m) => m.uid === currentUserId) ??
    members.find((m) => m.displayName === currentUserName);
  const selfUid = selfMember?.uid ?? currentUserId;

  // When self tab is selected, always search checkins by firebaseUser uid
  const isSelfSelected = selectedMemberId === selfUid || selectedMemberId === currentUserId;
  const checkinUserId = isSelfSelected ? currentUserId : selectedMemberId;
  const checkin = checkins.find((c) => c.userId === checkinUserId) ?? null;
  const selectedMember = members.find((m) => m.uid === selectedMemberId);

  async function handleSend() {
    if (!checkin) return;
    const text = texts[checkin.id]?.trim();
    if (!text) return;
    setSending(checkin.id);
    try {
      const enc: Encouragement = {
        authorId: currentUserId,
        authorName: currentUserName,
        text,
        createdAt: Date.now(),
      };
      await addEncouragement(wingId, checkin.id, enc);
      onEncouragementSent(checkin.id, enc);
      setTexts((prev) => ({ ...prev, [checkin.id]: "" }));
      toast.success("העידוד נשלח! 💪");
    } catch {
      toast.error("שגיאה בשליחה");
    } finally {
      setSending(null);
    }
  }

  return (
    <div className="bg-white rounded-3xl shadow-card border border-slate-100 overflow-hidden">
      {/* Date header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <button
          onClick={onPrevDay}
          className="p-1.5 hover:bg-slate-100 rounded-xl transition-colors"
        >
          <ChevronRight size={20} className="text-slate-500" />
        </button>
        <p className="font-bold text-slate-800 text-sm">{dateFormatted}</p>
        <button
          onClick={onNextDay}
          disabled={!canGoNext}
          className="p-1.5 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-30"
        >
          <ChevronLeft size={20} className="text-slate-500" />
        </button>
      </div>

      {/* Member tabs */}
      {members.length > 1 && (
        <div className="flex gap-2 overflow-x-auto px-4 py-2.5 border-b border-slate-100">
          {members.map((m) => (
            <button
              key={m.uid}
              onClick={() => setSelectedMemberId(m.uid)}
              className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                (isSelfSelected && m.uid === selfUid) || (!isSelfSelected && selectedMemberId === m.uid)
                  ? "bg-wing-primary text-white"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              {m.uid === selfUid ? "שלי" : m.displayName.split(" ")[0]}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {!checkin ? (
          <div className="text-center py-8 space-y-1">
            <p className="text-2xl">📋</p>
            <p className="text-slate-400 text-sm">
              {selectedMember?.displayName?.split(" ")[0] ?? "המשתמש"} לא עשה צ׳ק-אין ביום זה
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Stats row */}
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-slate-50 rounded-2xl p-3 text-center">
                <p className="text-lg">💧</p>
                <p className="text-sm font-bold text-slate-700">{checkin.waterGlasses.toFixed(1)}L</p>
                <p className="text-xs text-slate-400">מים</p>
              </div>
              <div className="bg-slate-50 rounded-2xl p-3 text-center">
                <p className="text-lg">🥦</p>
                <p className="text-sm font-bold text-slate-700">{checkin.vegetablesServings}</p>
                <p className="text-xs text-slate-400">ירקות</p>
              </div>
              <div className="bg-slate-50 rounded-2xl p-3 text-center">
                <p className="text-lg">👟</p>
                <p className="text-sm font-bold text-slate-700">
                  {checkin.steps ? (checkin.steps >= 1000 ? `${(checkin.steps / 1000).toFixed(1)}k` : checkin.steps) : "—"}
                </p>
                <p className="text-xs text-slate-400">צעדים</p>
              </div>
              <div className="bg-slate-50 rounded-2xl p-3 text-center">
                <p className="text-xl">{moods.find((m) => m.value === checkin.mood)?.emoji ?? "😐"}</p>
                <p className="text-xs text-slate-400 mt-1">מצב רוח</p>
              </div>
            </div>

            {/* Weight */}
            {checkin.weightKg && (
              <div className="flex items-center gap-2 bg-slate-50 rounded-2xl px-4 py-2.5">
                <span className="text-lg">⚖️</span>
                <span className="text-sm text-slate-600">משקל:</span>
                <span className="font-semibold text-slate-800">{checkin.weightKg} ק״ג</span>
              </div>
            )}

            {/* Workout */}
            {checkin.workout?.done && (
              <div className="bg-green-50 rounded-2xl px-4 py-3 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🏋️</span>
                  <span className="text-sm font-semibold text-green-700">אימון</span>
                  {checkin.workout.caloriesBurned && (
                    <span className="text-xs text-green-600 mr-auto">🔥 {checkin.workout.caloriesBurned} קק״ל</span>
                  )}
                </div>
                {(checkin.workout.type || checkin.workout.durationMinutes) && (
                  <p className="text-xs text-green-600 mr-7">
                    {checkin.workout.type && <span className="capitalize">{checkin.workout.type}</span>}
                    {checkin.workout.intensity && <span> · {checkin.workout.intensity}</span>}
                    {checkin.workout.durationMinutes && <span> · {checkin.workout.durationMinutes} דקות</span>}
                  </p>
                )}
              </div>
            )}

            {/* Notes */}
            {checkin.notes && (
              <p className="text-sm text-slate-600 italic bg-slate-50 rounded-xl px-3 py-2.5">
                &ldquo;{checkin.notes}&rdquo;
              </p>
            )}

            {/* Day summary */}
            {checkin.daySummary && (
              <div className="bg-wing-soft rounded-2xl p-4 space-y-2">
                <p className="text-sm font-semibold text-wing-primary">🌙 סיכום יום</p>
                <p className="text-sm text-slate-700">{checkin.daySummary.summary}</p>
                {checkin.daySummary.insights.length > 0 && (
                  <ul className="space-y-1">
                    {checkin.daySummary.insights.map((ins, i) => (
                      <li key={i} className="text-xs text-slate-600 flex gap-1.5">
                        <span className="text-wing-primary mt-0.5">•</span>
                        <span>{ins}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {checkin.daySummary.tip && (
                  <p className="text-xs text-wing-primary font-medium pt-1 border-t border-wing-primary/20">
                    💡 {checkin.daySummary.tip}
                  </p>
                )}
              </div>
            )}

            {/* Encouragements */}
            {(checkin.encouragements ?? []).length > 0 && (
              <div className="space-y-1.5">
                {checkin.encouragements!.map((enc, i) => (
                  <div key={i} className="bg-wing-soft rounded-xl px-3 py-2">
                    <span className="text-sm font-medium text-wing-primary">{enc.authorName}: </span>
                    <span className="text-sm text-slate-600">{enc.text}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Encouragement input */}
            {(checkin.userId !== currentUserId || (checkin.encouragements ?? []).length > 0) && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={texts[checkin.id] ?? ""}
                  onChange={(e) => setTexts((prev) => ({ ...prev, [checkin.id]: e.target.value }))}
                  placeholder={
                    checkin.userId === currentUserId
                      ? "הגב / תודה על העידוד..."
                      : `עודד את ${checkin.userName.split(" ")[0]}...`
                  }
                  className="flex-1 text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-wing-primary bg-white"
                  onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
                />
                <Button
                  size="sm"
                  onClick={handleSend}
                  loading={sending === checkin.id}
                  disabled={!texts[checkin.id]?.trim()}
                >
                  שלח
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
