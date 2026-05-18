"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWing } from "@/hooks/useWing";
import { getMonthCheckins } from "@/lib/firebase/firestore";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isToday,
  addDays,
  subDays,
  parseISO,
  isFuture,
} from "date-fns";
import { he } from "date-fns/locale";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { DayPanel } from "@/components/calendar/DayPanel";
import type { DailyCheckin, Encouragement } from "@/types";

const DAY_LABELS = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

function todayStr() {
  return format(new Date(), "yyyy-MM-dd");
}

export default function CalendarPage() {
  const { user, firebaseUser } = useAuth();
  const { wing } = useWing(user?.wingId);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [checkins, setCheckins] = useState<DailyCheckin[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr());
  const [loading, setLoading] = useState(false);

  const yearMonth = format(currentDate, "yyyy-MM");

  useEffect(() => {
    if (!user?.wingId) return;
    setLoading(true);
    getMonthCheckins(user.wingId, yearMonth)
      .then(setCheckins)
      .finally(() => setLoading(false));
  }, [user?.wingId, yearMonth]);

  // When selected date changes, make sure the calendar month follows
  useEffect(() => {
    const d = parseISO(selectedDate);
    if (
      d.getFullYear() !== currentDate.getFullYear() ||
      d.getMonth() !== currentDate.getMonth()
    ) {
      setCurrentDate(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  }, [selectedDate]);

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

  function goToPrevDay() {
    setSelectedDate((d) => format(subDays(parseISO(d), 1), "yyyy-MM-dd"));
  }

  function goToNextDay() {
    const next = addDays(parseISO(selectedDate), 1);
    if (!isFuture(next) || format(next, "yyyy-MM-dd") === todayStr()) {
      setSelectedDate(format(next, "yyyy-MM-dd"));
    }
  }

  const canGoNext = !isFuture(addDays(parseISO(selectedDate), 1));

  // Swipe handling
  const touchStartX = useRef<number | null>(null);
  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goToNextDay();   // swiped left → next day
      else goToPrevDay();            // swiped right → prev day
    }
    touchStartX.current = null;
  }

  return (
    <div className="p-4 space-y-4">
      {/* Month navigation */}
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
          const future = isFuture(day) && !today;
          const isSelected = dateStr === selectedDate;

          return (
            <button
              key={dateStr}
              onClick={() => !future && setSelectedDate(dateStr)}
              disabled={future}
              className={[
                "relative aspect-square flex flex-col items-center justify-center rounded-xl text-sm transition-all",
                isSelected && !today
                  ? "ring-2 ring-wing-primary bg-wing-soft text-wing-primary font-bold"
                  : "",
                today
                  ? "bg-wing-primary text-white font-bold shadow-md"
                  : "",
                hasCheckins && !today && !isSelected
                  ? "bg-wing-soft/60 text-wing-primary font-semibold"
                  : "",
                !hasCheckins && !today && !isSelected && !future
                  ? "text-slate-500 hover:bg-slate-50"
                  : "",
                future ? "text-slate-200 cursor-default" : "cursor-pointer",
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
                      className={`w-1 h-1 rounded-full ${today || isSelected ? "bg-white/80" : "bg-wing-primary"}`}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {loading && (
        <div className="text-center py-2 text-slate-400 text-sm">טוען...</div>
      )}

      {/* Day panel */}
      {user && firebaseUser && (
        <div
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <DayPanel
            date={selectedDate}
            checkins={getDayCheckins(selectedDate)}
            members={wing?.members ?? [{ uid: firebaseUser.uid, displayName: user.displayName }]}
            wingId={user.wingId ?? ""}
            currentUserId={firebaseUser.uid}
            currentUserName={user.displayName}
            onPrevDay={goToPrevDay}
            onNextDay={goToNextDay}
            canGoNext={canGoNext}
            onEncouragementSent={handleEncouragementSent}
          />
        </div>
      )}
    </div>
  );
}
