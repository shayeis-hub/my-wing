"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { he, enUS } from "date-fns/locale";
import { ChevronRight, ChevronLeft, Droplets, Leaf, Footprints, Smile, Dumbbell, Flame } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { addEncouragement } from "@/lib/firebase/firestore";
import Link from "next/link";
import type { DailyCheckin, Encouragement, WingMember } from "@/types";
import toast from "react-hot-toast";
import { useLanguage } from "@/lib/i18n";

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
  const { t, lang } = useLanguage();
  const dateLocale = lang === "he" ? he : enUS;
  const dateFormatted = format(parseISO(date), "EEEE, d MMMM", { locale: dateLocale });

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
      toast.success(t("enc_sent"));
    } catch {
      toast.error(t("enc_error"));
    } finally {
      setSending(null);
    }
  }

  return (
    <div className="bg-wing-surface rounded-[14px] border border-wing-border overflow-hidden">
      {/* Date header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-wing-border">
        <button
          onClick={onPrevDay}
          className="p-1.5 hover:bg-wing-elevated rounded-xl transition-colors"
        >
          <ChevronRight size={20} className="text-wing-muted" />
        </button>
        <p className="font-bold text-wing-ink text-sm">{dateFormatted}</p>
        <button
          onClick={onNextDay}
          disabled={!canGoNext}
          className="p-1.5 hover:bg-wing-elevated rounded-xl transition-colors disabled:opacity-30"
        >
          <ChevronLeft size={20} className="text-wing-muted" />
        </button>
      </div>

      {/* Member tabs */}
      {members.length > 1 && (
        <div className="flex gap-2 overflow-x-auto px-4 py-2.5 border-b border-wing-border">
          {members.map((m) => (
            <button
              key={m.uid}
              onClick={() => setSelectedMemberId(m.uid)}
              className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                (isSelfSelected && m.uid === selfUid) || (!isSelfSelected && selectedMemberId === m.uid)
                  ? "bg-wing-primary text-white"
                  : "bg-wing-elevated text-wing-muted hover:bg-wing-elevated"
              }`}
            >
              {m.uid === selfUid ? t("my") : m.displayName.split(" ")[0]}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {!checkin ? (
          <div className="text-center py-8 space-y-1">
            <p className="text-2xl">📋</p>
            <p className="text-wing-subtle text-sm">
              {(t("daypanel_no_checkin") as (name: string) => string)(selectedMember?.displayName?.split(" ")[0] ?? "")}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Stats row */}
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-wing-elevated border border-wing-border rounded-2xl p-3 text-center">
                <Droplets size={16} className="mx-auto text-blue-400 mb-1" />
                <p className="text-sm font-bold text-wing-ink">{checkin.waterGlasses.toFixed(1)}L</p>
                <p className="font-mono text-xs text-wing-muted uppercase tracking-wider mt-0.5">{t("water_label")}</p>
              </div>
              <div className="bg-wing-elevated border border-wing-border rounded-2xl p-3 text-center">
                <Leaf size={16} className="mx-auto text-green-500 mb-1" />
                <p className="text-sm font-bold text-wing-ink">{checkin.vegetablesServings}</p>
                <p className="font-mono text-xs text-wing-muted uppercase tracking-wider mt-0.5">{t("veg_label")}</p>
              </div>
              <div className="bg-wing-elevated border border-wing-border rounded-2xl p-3 text-center">
                <Footprints size={16} className="mx-auto text-wing-muted mb-1" />
                <p className="text-sm font-bold text-wing-ink">
                  {checkin.steps ? (checkin.steps >= 1000 ? `${(checkin.steps / 1000).toFixed(1)}k` : checkin.steps) : "—"}
                </p>
                <p className="font-mono text-xs text-wing-muted uppercase tracking-wider mt-0.5">{t("steps_label")}</p>
              </div>
              <div className="bg-wing-elevated border border-wing-border rounded-2xl p-3 text-center">
                <Smile size={16} className="mx-auto text-wing-honey mb-1" />
                <p className="text-sm font-bold text-wing-ink">{moods.find((m) => m.value === checkin.mood)?.emoji ?? "😐"}</p>
                <p className="font-mono text-xs text-wing-muted uppercase tracking-wider mt-0.5">{t("mood_label")}</p>
              </div>
            </div>

            {/* Weight */}
            {checkin.weightKg && (
              <div className="flex items-center gap-2 bg-wing-elevated rounded-2xl px-4 py-2.5">
                <span className="text-lg">⚖️</span>
                <span className="text-sm text-wing-muted">{t("weight_label")}:</span>
                <span className="font-semibold text-wing-ink">{checkin.weightKg} {t("kg_label")}</span>
              </div>
            )}

            {/* Workout */}
            {checkin.workout?.done && (
              <div className="bg-green-50 rounded-2xl px-4 py-3 space-y-1">
                <div className="flex items-center gap-2">
                  <Dumbbell size={15} className="text-green-600" />
                  <span className="text-sm font-semibold text-green-700">{t("workout_label")}</span>
                  {checkin.workout.caloriesBurned && (
                    <span className="text-xs text-green-600 mr-auto flex items-center gap-0.5">
                      <Flame size={11} /> {checkin.workout.caloriesBurned} {t("kcal")}
                    </span>
                  )}
                </div>
                {(checkin.workout.type || checkin.workout.durationMinutes) && (
                  <p className="text-xs text-green-600 mr-7">
                    {checkin.workout.type && <span className="capitalize">{checkin.workout.type}</span>}
                    {checkin.workout.intensity && <span> · {checkin.workout.intensity}</span>}
                    {checkin.workout.durationMinutes && <span> · {checkin.workout.durationMinutes} {t("minutes")}</span>}
                  </p>
                )}
              </div>
            )}

            {/* Notes */}
            {checkin.notes && (
              <p className="text-sm text-wing-muted italic bg-wing-elevated rounded-xl px-3 py-2.5">
                &ldquo;{checkin.notes}&rdquo;
              </p>
            )}

            {/* Day summary */}
            {checkin.daySummary && (
              <div className="bg-wing-elevated rounded-2xl p-4 space-y-2">
                <p className="text-sm font-semibold text-wing-heat">{t("daypanel_day_summary")}</p>
                <p className="text-sm text-wing-ink">{checkin.daySummary.summary}</p>
                {checkin.daySummary.insights.length > 0 && (
                  <ul className="space-y-1">
                    {checkin.daySummary.insights.map((ins, i) => (
                      <li key={i} className="text-xs text-wing-muted flex gap-1.5">
                        <span className="text-wing-heat mt-0.5">•</span>
                        <span>{ins}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {checkin.daySummary.tip && (
                  <p className="text-xs text-wing-heat font-medium pt-1 border-t border-wing-primary/20">
                    💡 {checkin.daySummary.tip}
                  </p>
                )}
              </div>
            )}

            {/* Encouragements */}
            {(checkin.encouragements ?? []).length > 0 && (
              <div className="space-y-1.5">
                {checkin.encouragements!.map((enc, i) => (
                  <div key={i} className="bg-wing-elevated rounded-xl px-3 py-2">
                    <span className="text-sm font-medium text-wing-heat">{enc.authorName}: </span>
                    <span className="text-sm text-wing-muted">{enc.text}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Retroactive close day */}
            {isSelfSelected && !checkin.daySummary && date < format(new Date(), "yyyy-MM-dd") && (
              <Link
                href={`/checkin?date=${date}`}
                className="flex items-center justify-center gap-2 w-full text-sm font-medium text-wing-heat bg-wing-elevated px-4 py-2.5 rounded-2xl hover:bg-wing-accent/20 transition-colors"
              >
                {t("daypanel_close_day")}
              </Link>
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
                      ? t("daypanel_reply_ph")
                      : (t("checkin_encourage_ph") as (name: string) => string)(checkin.userName.split(" ")[0])
                  }
                  className="flex-1 text-sm border border-wing-border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-wing-ink bg-white"
                  onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
                />
                <Button
                  size="sm"
                  onClick={handleSend}
                  loading={sending === checkin.id}
                  disabled={!texts[checkin.id]?.trim()}
                >
                  {t("send")}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
