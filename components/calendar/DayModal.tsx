"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { he } from "date-fns/locale";
import { Button } from "@/components/ui/Button";
import { addEncouragement } from "@/lib/firebase/firestore";
import type { DailyCheckin, Encouragement } from "@/types";
import toast from "react-hot-toast";

const moods = [
  { value: 1, emoji: "😞" },
  { value: 2, emoji: "😕" },
  { value: 3, emoji: "😐" },
  { value: 4, emoji: "🙂" },
  { value: 5, emoji: "😄" },
];

interface DayModalProps {
  date: string;
  checkins: DailyCheckin[];
  wingId: string;
  currentUserId: string;
  currentUserName: string;
  onClose: () => void;
  onEncouragementSent: (checkinId: string, enc: Encouragement) => void;
}

export function DayModal({
  date,
  checkins,
  wingId,
  currentUserId,
  currentUserName,
  onClose,
  onEncouragementSent,
}: DayModalProps) {
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<string | null>(null);

  async function handleSend(checkin: DailyCheckin) {
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

  const dateFormatted = format(parseISO(date), "EEEE, d MMMM yyyy", { locale: he });

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[82vh] flex flex-col">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <h2 className="font-bold text-slate-800">{dateFormatted}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="overflow-y-auto p-4 space-y-4">
          {checkins.length === 0 ? (
            <p className="text-center text-slate-400 py-8">אין צ&apos;ק-אין לתאריך זה</p>
          ) : (
            checkins.map((checkin) => (
              <div key={checkin.id} className="bg-slate-50 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">{checkin.userName}</span>
                  <div className="flex gap-3 text-sm text-slate-500">
                    <span>💧 {checkin.waterGlasses.toFixed(1)}L</span>
                    <span>🥦 {checkin.vegetablesServings}</span>
                    {checkin.steps ? <span>👟 {checkin.steps.toLocaleString()}</span> : null}
                    <span className="text-lg">{moods.find((m) => m.value === checkin.mood)?.emoji}</span>
                  </div>
                </div>

                {checkin.notes && (
                  <p className="text-sm text-slate-600 italic bg-white rounded-xl px-3 py-2">
                    &ldquo;{checkin.notes}&rdquo;
                  </p>
                )}

                {(checkin.encouragements ?? []).length > 0 && (
                  <div className="space-y-1">
                    {checkin.encouragements!.map((enc, i) => (
                      <div key={i} className="text-xs bg-wing-soft rounded-xl px-3 py-1.5">
                        <span className="font-medium text-wing-primary">{enc.authorName}: </span>
                        <span className="text-slate-600">{enc.text}</span>
                      </div>
                    ))}
                  </div>
                )}

                {(checkin.userId !== currentUserId ||
                  (checkin.encouragements ?? []).length > 0) && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={texts[checkin.id] ?? ""}
                      onChange={(e) =>
                        setTexts((prev) => ({ ...prev, [checkin.id]: e.target.value }))
                      }
                      placeholder={
                        checkin.userId === currentUserId
                          ? "הגב / תודה על העידוד..."
                          : `עודד את ${checkin.userName}...`
                      }
                      className="flex-1 text-sm border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-wing-primary bg-white"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSend(checkin);
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={() => handleSend(checkin)}
                      loading={sending === checkin.id}
                      disabled={!texts[checkin.id]?.trim()}
                    >
                      שלח
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
