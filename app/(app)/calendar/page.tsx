"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getMonthCheckins } from "@/lib/firebase/firestore";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isToday,
  parseISO,
} from "date-fns";
import { he } from "date-fns/locale";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { DayModal } from "@/components/calendar/DayModal";
import type { DailyCheckin, Encouragement } from "@/types";

const DAY_LABELS = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

export default function CalendarPage() {
  const { user, firebaseUser } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [checkins, setCheckins] = useState<DailyCheckin[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const yearMonth = format(currentDate, "yyyy-MM");

  useEffect(() => {
    if (!user?.wingId) return;
    setLoading(true);
    getMonthCheckins(user.wingId, yearMonth)
      .then(setCheckins)
      .finally(() => setLoading(false));
  }, [user?.wingId, yearMonth]);

  const days = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate),
  });

  const firstDayOffset = getDay(startOfMonth(currentDate));

  function getDayCheckins(dateStr: string) {
    return checkins.filter((c) => c.date === dateStr);
  }

  function handleEncouragementSent(checkinId: string, enc: Encouragement) {
    setCheckins((prev) =>
      prev.map((c) =>
        c.id === checkinId
          ? { ...c, encouragements: [...(c.encouragements ?? []), enc] }
          : c
      )
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="pt-4 flex items-center justify-between">
        <button
          onClick={() =>
            setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
          }
          className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
        >
          <ChevronRight size={20} className="text-slate-600" />
        </button>
        <h1 className="text-xl font-bold text-slate-800">
          {format(currentDate, "MMMM yyyy", { locale: he })}
        </h1>
        <button
          onClick={() =>
            setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
          }
          className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
          disabled={
            currentDate.getFullYear() === new Date().getFullYear() &&
            currentDate.getMonth() === new Date().getMonth()
          }
        >
          <ChevronLeft size={20} className="text-slate-600 disabled:opacity-30" />
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {DAY_LABELS.map((d) => (
          <div key={d} className="text-xs text-slate-400 font-medium py-1">
            {d}
          </div>
        ))}

        {/* Empty offset cells */}
        {Array.from({ length: firstDayOffset }).map((_, i) => (
          <div key={`e-${i}`} />
        ))}

        {/* Day cells */}
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const dayCheckins = getDayCheckins(dateStr);
          const hasCheckins = dayCheckins.length > 0;
          const today = isToday(day);
          const isFuture = day > new Date();

          return (
            <button
              key={dateStr}
              onClick={() => !isFuture ? setSelectedDate(dateStr) : undefined}
              disabled={isFuture}
              className={[
                "relative aspect-square flex flex-col items-center justify-center rounded-xl text-sm transition-all",
                today ? "bg-wing-primary text-white font-bold shadow-md" : "",
                hasCheckins && !today ? "bg-wing-soft text-wing-primary font-semibold" : "",
                !hasCheckins && !today && !isFuture ? "text-slate-500 hover:bg-slate-50" : "",
                isFuture ? "text-slate-200 cursor-default" : "cursor-pointer",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span>{format(day, "d")}</span>
              {hasCheckins && (
                <div className="flex gap-0.5 mt-0.5">
                  {dayCheckins.slice(0, 4).map((_, i) => (
                    <div
                      key={i}
                      className={`w-1 h-1 rounded-full ${today ? "bg-white/80" : "bg-wing-primary"}`}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {loading && (
        <div className="text-center py-4 text-slate-400 text-sm">טוען...</div>
      )}

      {!loading && checkins.length === 0 && (
        <p className="text-center text-slate-400 text-sm py-4">
          אין צ&apos;ק-אינים לחודש זה
        </p>
      )}

      {selectedDate && user && firebaseUser && (
        <DayModal
          date={selectedDate}
          checkins={getDayCheckins(selectedDate)}
          wingId={user.wingId ?? ""}
          currentUserId={firebaseUser.uid}
          currentUserName={user.displayName}
          onClose={() => setSelectedDate(null)}
          onEncouragementSent={handleEncouragementSent}
        />
      )}
    </div>
  );
}
