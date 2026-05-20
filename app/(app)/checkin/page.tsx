"use client";

import { useEffect, useState, Suspense } from "react";
import { useAuth } from "@/hooks/useAuth";
import { g } from "@/lib/utils/gender";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import {
  saveCheckin, getTodayCheckin, getWingCheckins, getWingSteps, addEncouragement, saveWeightLog, getUserTodayMeals,
} from "@/lib/firebase/firestore";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { useSearchParams } from "next/navigation";
import type { DailyCheckin, Encouragement } from "@/types";
import { Droplets, Leaf, Footprints, Dumbbell, Smile, Scale, Pencil, Moon, Lightbulb, Timer } from "lucide-react";

const moods = [
  { value: 1, emoji: "😞", label: "קשה" },
  { value: 2, emoji: "😕", label: "לא טוב" },
  { value: 3, emoji: "😐", label: "סביר" },
  { value: 4, emoji: "😊", label: "טוב" },
  { value: 5, emoji: "🤩", label: "מעולה" },
];

const WORKOUT_TYPES: { value: string; label: string }[] = [
  { value: "running", label: "🏃 ריצה" },
  { value: "walking", label: "🚶 הליכה" },
  { value: "cycling", label: "🚴 אופניים" },
  { value: "weights", label: "🏋️ משקולות" },
  { value: "hiit", label: "⚡ HIIT" },
  { value: "swimming", label: "🏊 שחייה" },
  { value: "yoga", label: "🧘 יוגה" },
  { value: "other", label: "🤸 אחר" },
];

const MET: Record<string, Record<"light" | "moderate" | "intense", number>> = {
  running:  { light: 8,   moderate: 11,  intense: 14  },
  walking:  { light: 2.5, moderate: 3.5, intense: 4.5 },
  cycling:  { light: 4,   moderate: 8,   intense: 12  },
  weights:  { light: 3,   moderate: 5,   intense: 6   },
  hiit:     { light: 8,   moderate: 10,  intense: 12  },
  swimming: { light: 5,   moderate: 7,   intense: 10  },
  yoga:     { light: 2.5, moderate: 3,   intense: 3.5 },
  other:    { light: 4,   moderate: 6,   intense: 8   },
};

function calcWorkoutCalories(type: string, intensity: "light" | "moderate" | "intense", durationMin: number, weightKg: number): number {
  const met = MET[type]?.[intensity] ?? 5;
  return Math.round(met * weightKg * (durationMin / 60));
}

async function sendEncouragementPush(targetUserId: string, authorName: string, text: string) {
  await fetch("/api/notifications/encouragement", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targetUserId, authorName, message: text }),
  });
}

function SectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-wing-surface border border-wing-border rounded-[20px] p-5 ${className}`}>
      {children}
    </div>
  );
}

function MonoLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-xs tracking-[0.18em] uppercase text-wing-muted">
      {children}
    </span>
  );
}

function CheckinPageInner() {
  const { user, firebaseUser } = useAuth();
  const searchParams = useSearchParams();
  const paramDate = searchParams.get("date");
  const [myCheckin, setMyCheckin] = useState<DailyCheckin | null>(null);
  const [groupCheckins, setGroupCheckins] = useState<DailyCheckin[]>([]);
  const [water, setWater] = useState(0);
  const [vegetables, setVegetables] = useState(0);
  const [mood, setMood] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [notes, setNotes] = useState("");
  const [steps, setSteps] = useState("");
  const [workoutDone, setWorkoutDone] = useState(false);
  const [workoutType, setWorkoutType] = useState("running");
  const [workoutIntensity, setWorkoutIntensity] = useState<"light" | "moderate" | "intense">("moderate");
  const [workoutDuration, setWorkoutDuration] = useState("");
  const [weight, setWeight] = useState("");
  const [saving, setSaving] = useState(false);
  const [encourageTexts, setEncourageTexts] = useState<Record<string, string>>({});
  const [sendingEnc, setSendingEnc] = useState<string | null>(null);
  const [closingDay, setClosingDay] = useState(false);
  const [daySummary, setDaySummary] = useState<{ summary: string; insights: string[]; tip: string } | null>(null);
  const [ewOpen, setEwOpen] = useState("");
  const [ewClose, setEwClose] = useState("");
  const [ewManual, setEwManual] = useState(false);
  const today = format(new Date(), "yyyy-MM-dd");
  const selectedDate = paramDate ?? today;
  const isRetro = selectedDate !== today;

  useEffect(() => {
    if (!user?.wingId || !firebaseUser) return;
    const uid = firebaseUser.uid;
    Promise.all([
      getTodayCheckin(user.wingId, uid, selectedDate),
      getWingSteps(user.wingId, selectedDate),
      getWingCheckins(user.wingId, selectedDate),
    ]).then(([c, stepsEntries, checkins]) => {
      const stepsFromLeaderboard = stepsEntries.find((e) => e.userId === uid)?.steps;
      if (c) {
        setMyCheckin(c);
        setWater(c.waterGlasses ?? 0);
        setVegetables(c.vegetablesServings ?? 0);
        setMood(c.mood ?? 3);
        setNotes(c.notes ?? "");
        setSteps(c.steps ? String(c.steps) : stepsFromLeaderboard ? String(stepsFromLeaderboard) : "");
        setWorkoutDone(c.workout?.done ?? false);
        setWorkoutType(c.workout?.type ?? "running");
        setWorkoutIntensity(c.workout?.intensity ?? "moderate");
        setWorkoutDuration(c.workout?.durationMinutes ? String(c.workout.durationMinutes) : "");
        setWeight(c.weightKg ? String(c.weightKg) : "");
        if (c.daySummary) setDaySummary(c.daySummary);
        if (c.eatingWindow) {
          setEwOpen(c.eatingWindow.open);
          setEwClose(c.eatingWindow.close);
        }
      } else {
        if (stepsFromLeaderboard) setSteps(String(stepsFromLeaderboard));
      }
      setGroupCheckins(checkins);

      // Load meals separately — failure here must not block checkin display
      if (!c?.eatingWindow) {
        getUserTodayMeals(user.wingId!, uid, selectedDate)
          .then(applyMealTimes)
          .catch(() => {/* non-critical */});
      }
    });
  }, [user?.wingId, firebaseUser, today]);

  function applyMealTimes(meals: import("@/types").Meal[]) {
    if (!meals.length) return;
    const times = meals.map((m) => {
      const ts = m.createdAt as unknown as { toDate?: () => Date; _seconds?: number };
      return ts?.toDate ? ts.toDate() : new Date((ts?._seconds ?? 0) * 1000);
    }).filter(Boolean);
    if (!times.length) return;
    const toHHMM = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    setEwOpen(toHHMM(times[0]));
    if (times.length > 1) setEwClose(toHHMM(times[times.length - 1]));
  }

  function calcEwDuration(open: string, close: string): number {
    if (!open || !close) return 0;
    const [oh, om] = open.split(":").map(Number);
    const [ch, cm] = close.split(":").map(Number);
    const mins = (ch * 60 + cm) - (oh * 60 + om);
    return Math.max(0, Math.round(mins / 6) / 10);
  }

  async function handleSave() {
    if (!user?.wingId || !firebaseUser) return;
    setSaving(true);
    try {
      const trimmedNotes = notes.trim();
      const stepsNum = steps ? parseInt(steps) : undefined;
      const weightNum = weight ? parseFloat(weight) : undefined;
      const durationMin = workoutDuration ? parseInt(workoutDuration) : undefined;
      const weightForCalc = weightNum ?? user.profile?.weightKg ?? 70;
      const workoutCalNum = (workoutDone && durationMin)
        ? calcWorkoutCalories(workoutType, workoutIntensity, durationMin, weightForCalc)
        : undefined;
      const workoutTypeLabel = WORKOUT_TYPES.find(t => t.value === workoutType)?.label ?? workoutType;
      const intensityLabel = workoutIntensity === "light" ? "קל" : workoutIntensity === "moderate" ? "בינוני" : "אינטנסיבי";

      await saveCheckin(user.wingId, {
        wingId: user.wingId,
        userId: firebaseUser.uid,
        userName: user.displayName,
        date: selectedDate,
        waterGlasses: water,
        vegetablesServings: vegetables,
        mood,
        ...(trimmedNotes ? { notes: trimmedNotes } : {}),
        ...(stepsNum ? { steps: stepsNum } : {}),
        ...(weightNum ? { weightKg: weightNum } : {}),
        ...(ewOpen && ewClose ? { eatingWindow: { open: ewOpen, close: ewClose, durationHours: calcEwDuration(ewOpen, ewClose) } } : {}),
        workout: {
          done: workoutDone,
          ...(workoutDone ? { type: workoutType, intensity: workoutIntensity } : {}),
          ...(workoutDone && durationMin ? { durationMinutes: durationMin, description: `${workoutTypeLabel} · ${intensityLabel} · ${durationMin} דק'` } : {}),
          ...(workoutCalNum ? { caloriesBurned: workoutCalNum } : {}),
        },
      });

      if (weightNum && user.wingId) {
        try {
          await saveWeightLog(user.wingId, { userId: firebaseUser.uid, userName: user.displayName, date: selectedDate, weightKg: weightNum });
        } catch { /* non-critical */ }
      }

      toast.success(g(user?.profile?.gender, "הצ'ק-אין נשמר! 💪", "הצ'ק-אין נשמרה! 💪"));
      const refreshed = await getTodayCheckin(user.wingId, firebaseUser.uid, selectedDate);
      if (refreshed) setMyCheckin(refreshed);
    } catch {
      toast.error("שגיאה בשמירה");
    } finally {
      setSaving(false);
    }
  }

  async function handleSendEncouragement(checkin: DailyCheckin) {
    const text = encourageTexts[checkin.id]?.trim();
    if (!text || !user || !firebaseUser) return;
    setSendingEnc(checkin.id);
    try {
      const enc: Encouragement = { authorId: firebaseUser.uid, authorName: user.displayName, text, createdAt: Date.now() };
      await addEncouragement(user.wingId!, checkin.id, enc);
      await sendEncouragementPush(checkin.userId, user.displayName, text);
      setGroupCheckins((prev) => prev.map((c) => c.id === checkin.id ? { ...c, encouragements: [...(c.encouragements ?? []), enc] } : c));
      setEncourageTexts((prev) => ({ ...prev, [checkin.id]: "" }));
      toast.success("העידוד נשלח! 💪");
    } catch {
      toast.error("שגיאה בשליחה");
    } finally {
      setSendingEnc(null);
    }
  }

  async function handleCloseDay() {
    if (!myCheckin || !user?.wingId || !firebaseUser) return;
    setClosingDay(true);
    try {
      const res = await fetch("/api/ai/close-day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wingId: user.wingId, userId: firebaseUser.uid, date: today, checkin: myCheckin, userProfile: user.profile }),
      });
      if (!res.ok) throw new Error();
      const summary = await res.json();
      setDaySummary(summary);
      toast.success("סיכום היום נוצר! ✨");
    } catch {
      toast.error("שגיאה ביצירת הסיכום");
    } finally {
      setClosingDay(false);
    }
  }

  const waterPct = (water / 4) * 100;

  return (
    <div className="p-4 space-y-4">
      <div className="pt-4">
        <h1 className="text-2xl font-black text-wing-ink tracking-tight">צ׳ק-אין יומי</h1>
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-wing-muted mt-0.5">
          {format(new Date(selectedDate + "T12:00:00"), "EEEE, d MMMM", { locale: he })}
        </p>
        {isRetro && (
          <span className="inline-block text-xs text-wing-heat font-medium bg-wing-elevated border border-wing-border px-3 py-1 rounded-full mt-2">
            ✏️ מילוי רטרואקטיבי
          </span>
        )}
      </div>

      {/* Water slider */}
      <SectionCard>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Droplets size={16} className="text-blue-400" />
            <span className="font-semibold text-wing-ink">שתיית מים</span>
          </div>
          <span
            className="font-black tabular text-wing-ink"
            style={{ fontSize: 22, letterSpacing: "-0.04em", fontFeatureSettings: '"tnum"' }}
          >
            {water.toFixed(1)}
            <span className="text-sm font-normal text-wing-muted mr-0.5">L</span>
          </span>
        </div>
        <input
          type="range"
          min={0} max={4} step={0.1}
          value={water}
          onChange={(e) => setWater(parseFloat(e.target.value))}
          className="water-slider"
          style={{
            background: `linear-gradient(to left, #f5dd4b 0%, #ff6b47 ${waterPct}%, #ede5d0 ${waterPct}%, #ede5d0 100%)`,
          }}
        />
        <div className="flex justify-between text-xs font-mono text-wing-muted mt-2 tracking-wider">
          <span>0</span><span>1L</span><span>2L</span><span>3L</span><span>4L</span>
        </div>
        <div className="flex justify-center gap-1.5 mt-3 flex-wrap">
          {[0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4].map((v) => (
            <button
              key={v}
              onClick={() => setWater(v)}
              className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all ${
                water === v ? "text-wing-ink font-bold" : "bg-wing-elevated border border-wing-border text-wing-muted"
              }`}
              style={water === v ? { background: "linear-gradient(135deg, #f5dd4b, #ff6b47)" } : {}}
            >
              {v}L
            </button>
          ))}
        </div>
      </SectionCard>

      {/* Vegetables */}
      <SectionCard>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Leaf size={16} className="text-green-500" />
            <span className="font-semibold text-wing-ink">ירקות</span>
          </div>
          <MonoLabel>בארוחות היום</MonoLabel>
        </div>
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={() => setVegetables(Math.max(0, vegetables - 1))}
            className="w-11 h-11 bg-wing-elevated border border-wing-border rounded-full text-xl font-bold text-wing-muted hover:border-wing-ink transition-colors"
          >
            −
          </button>
          <span
            className="font-black tabular text-wing-ink w-14 text-center"
            style={{ fontSize: 42, letterSpacing: "-0.05em", fontFeatureSettings: '"tnum"' }}
          >
            {vegetables}
          </span>
          <button
            onClick={() => setVegetables(Math.min(6, vegetables + 1))}
            className="w-11 h-11 rounded-full text-xl font-bold text-wing-ink transition-all active:scale-95"
            style={{ background: "linear-gradient(135deg, #f5dd4b, #ff6b47)" }}
          >
            +
          </button>
        </div>
      </SectionCard>

      {/* Eating Window */}
      <SectionCard>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Timer size={16} className="text-wing-muted" />
            <span className="font-semibold text-wing-ink">חלון אכילה</span>
          </div>
          <button
            onClick={() => setEwManual((v) => !v)}
            className="text-xs text-wing-muted underline"
          >
            {ewManual ? "חזור לאוטומטי" : "ערוך ידנית"}
          </button>
        </div>

        {ewOpen && ewClose && !ewManual ? (
          <div className="flex items-center justify-between bg-wing-elevated border border-wing-border rounded-[14px] px-4 py-3">
            <div className="text-center">
              <p className="text-[10px] font-mono text-wing-muted uppercase tracking-wider mb-0.5">פתיחה</p>
              <p className="font-black text-wing-ink tabular" style={{ fontSize: 22, letterSpacing: "-0.04em" }}>{ewOpen}</p>
            </div>
            <div className="text-wing-muted text-lg">→</div>
            <div className="text-center">
              <p className="text-[10px] font-mono text-wing-muted uppercase tracking-wider mb-0.5">סגירה</p>
              <p className="font-black text-wing-ink tabular" style={{ fontSize: 22, letterSpacing: "-0.04em" }}>{ewClose}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-mono text-wing-muted uppercase tracking-wider mb-0.5">משך</p>
              <p className="font-black tabular" style={{ fontSize: 22, letterSpacing: "-0.04em", color: "#d4541a" }}>{calcEwDuration(ewOpen, ewClose)}h</p>
            </div>
          </div>
        ) : ewOpen && !ewClose && !ewManual ? (
          <div className="flex items-center gap-3 bg-wing-elevated border border-wing-border rounded-[14px] px-4 py-3">
            <div className="text-center">
              <p className="text-[10px] font-mono text-wing-muted uppercase tracking-wider mb-0.5">פתיחה</p>
              <p className="font-black text-wing-ink tabular" style={{ fontSize: 22, letterSpacing: "-0.04em" }}>{ewOpen}</p>
            </div>
            <div className="text-wing-muted text-lg">→</div>
            <p className="text-sm text-wing-subtle">ממתין לארוחה הבאה...</p>
          </div>
        ) : ewManual ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-wing-muted mb-1.5">פתיחת חלון</p>
                <input
                  type="time"
                  value={ewOpen}
                  onChange={(e) => setEwOpen(e.target.value)}
                  className="w-full px-3 py-2.5 bg-wing-elevated border border-wing-border rounded-[14px] text-sm text-wing-ink focus:outline-none focus:ring-2 focus:ring-wing-ink"
                />
              </div>
              <div>
                <p className="text-xs text-wing-muted mb-1.5">סגירת חלון</p>
                <input
                  type="time"
                  value={ewClose}
                  onChange={(e) => setEwClose(e.target.value)}
                  className="w-full px-3 py-2.5 bg-wing-elevated border border-wing-border rounded-[14px] text-sm text-wing-ink focus:outline-none focus:ring-2 focus:ring-wing-ink"
                />
              </div>
            </div>
            {ewOpen && ewClose && (
              <p className="text-sm text-center text-wing-muted">
                משך: <span className="font-bold text-wing-ink">{calcEwDuration(ewOpen, ewClose)} שעות</span>
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-wing-subtle text-center py-2">
            יחושב אוטומטית מהארוחות שנרשמו היום
          </p>
        )}
      </SectionCard>

      {/* Steps */}
      <SectionCard>
        <div className="flex items-center gap-2 mb-3">
          <Footprints size={16} className="text-wing-muted" />
          <span className="font-semibold text-wing-ink">צעדים</span>
        </div>
        <input
          type="number"
          value={steps}
          onChange={(e) => setSteps(e.target.value)}
          placeholder="כמה צעדים עשית היום?"
          inputMode="numeric"
          className="w-full px-4 py-3 bg-wing-elevated border border-wing-border rounded-[14px] text-sm text-wing-ink placeholder:text-wing-subtle focus:outline-none focus:ring-2 focus:ring-wing-ink transition-all"
        />
      </SectionCard>

      {/* Workout */}
      <SectionCard>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Dumbbell size={16} className="text-wing-muted" />
            <span className="font-semibold text-wing-ink">התאמנתי היום</span>
          </div>
          <Switch checked={workoutDone} onChange={setWorkoutDone} label="אימון" />
        </div>

        {workoutDone && (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {WORKOUT_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setWorkoutType(t.value)}
                  className={`text-sm px-3 py-2 rounded-[14px] border-2 text-right transition-all ${
                    workoutType === t.value
                      ? "border-wing-ink bg-wing-elevated text-wing-ink font-semibold"
                      : "border-wing-border bg-wing-elevated text-wing-muted"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              {(["light", "moderate", "intense"] as const).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setWorkoutIntensity(lvl)}
                  className={`flex-1 text-sm py-2 rounded-[14px] border-2 transition-all ${
                    workoutIntensity === lvl
                      ? "border-wing-ink bg-wing-elevated text-wing-ink font-semibold"
                      : "border-wing-border bg-wing-elevated text-wing-muted"
                  }`}
                >
                  {lvl === "light" ? "קל" : lvl === "moderate" ? "בינוני" : "אינטנסיבי"}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <input
                type="number"
                value={workoutDuration}
                onChange={(e) => setWorkoutDuration(e.target.value)}
                placeholder="משך האימון"
                inputMode="numeric"
                className="flex-1 px-4 py-2.5 bg-wing-elevated border border-wing-border rounded-[14px] text-sm text-wing-ink placeholder:text-wing-subtle focus:outline-none focus:ring-2 focus:ring-wing-ink"
              />
              <span className="text-sm text-wing-muted shrink-0">דקות</span>
            </div>

            {workoutDuration && parseInt(workoutDuration) > 0 && (
              <p className="text-sm text-green-700 bg-green-50 rounded-[14px] px-4 py-2 text-center font-medium">
                🔥 כ-{calcWorkoutCalories(workoutType, workoutIntensity, parseInt(workoutDuration), user?.profile?.weightKg ?? 70)} קק&quot;ל
              </p>
            )}
          </div>
        )}
      </SectionCard>

      {/* Mood */}
      <SectionCard>
        <div className="flex items-center gap-2 mb-4">
          <Smile size={16} className="text-wing-honey" />
          <span className="font-semibold text-wing-ink">מצב רוח</span>
        </div>
        <div className="flex justify-around">
          {moods.map((m) => (
            <button
              key={m.value}
              onClick={() => setMood(m.value as 1 | 2 | 3 | 4 | 5)}
              className={`flex flex-col items-center gap-1 p-2.5 rounded-[14px] transition-all active:scale-95 ${
                mood === m.value ? "scale-110" : "hover:bg-wing-elevated"
              }`}
              style={mood === m.value ? { background: "linear-gradient(135deg, #fff3b8, #ffc89a)" } : {}}
            >
              <span className="text-2xl">{m.emoji}</span>
              <MonoLabel>{m.label}</MonoLabel>
            </button>
          ))}
        </div>
      </SectionCard>

      {/* Weight */}
      <SectionCard>
        <div className="flex items-center gap-2 mb-3">
          <Scale size={16} className="text-wing-muted" />
          <span className="font-semibold text-wing-ink">עדכון משקל</span>
          <span className="text-xs text-wing-subtle">(אופציונלי)</span>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder={user?.profile?.weightKg ? `משקל רשום: ${user.profile.weightKg}` : "משקל היום..."}
            inputMode="decimal"
            step="0.1"
            className="flex-1 px-4 py-3 bg-wing-elevated border border-wing-border rounded-[14px] text-sm text-wing-ink placeholder:text-wing-subtle focus:outline-none focus:ring-2 focus:ring-wing-ink"
          />
          <span className="text-sm text-wing-muted shrink-0">ק&quot;ג</span>
        </div>
      </SectionCard>

      {/* Free text */}
      <SectionCard>
        <div className="flex items-center gap-2 mb-3">
          <Pencil size={16} className="text-wing-muted" />
          <span className="font-semibold text-wing-ink">הערה חופשית</span>
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="איך היה היום? משהו שרצית לציין..."
          rows={3}
          className="w-full px-4 py-3 bg-wing-elevated border border-wing-border rounded-[14px] text-sm text-wing-ink placeholder:text-wing-subtle resize-none focus:outline-none focus:ring-2 focus:ring-wing-ink transition-all"
        />
      </SectionCard>

      {/* CTA */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-4 rounded-[14px] font-extrabold text-wing-ink text-base transition-all active:scale-[0.97] disabled:opacity-60"
        style={{ background: "linear-gradient(135deg, #f5dd4b, #ff6b47)" }}
      >
        {saving ? g(user?.profile?.gender, "שומר...", "שומרת...") : myCheckin ? g(user?.profile?.gender, "עדכן צ׳ק-אין", "עדכני צ׳ק-אין") : g(user?.profile?.gender, "שמור צ׳ק-אין", "שמרי צ׳ק-אין")}
      </button>

      {/* Close day button */}
      {myCheckin && !daySummary && (
        <button
          onClick={handleCloseDay}
          disabled={closingDay}
          className="w-full py-3.5 rounded-[14px] border-2 border-wing-ink font-bold text-wing-ink text-sm transition-all active:scale-[0.97] disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {closingDay ? g(user?.profile?.gender, "מייצר סיכום AI...", "מייצרת סיכום AI...") : <><Moon size={16} /> סגירת יום</>}
        </button>
      )}

      {/* Day summary card */}
      {daySummary && (
        <div className="rounded-[20px] p-5 space-y-3" style={{ background: "linear-gradient(135deg, #fff3b8, #ffc89a)" }}>
          <div className="flex items-center gap-2">
            <Moon size={18} className="text-[#c79a00]" />
            <span className="font-black text-wing-ink text-lg">סיכום היום שלך</span>
          </div>
          <p className="text-sm text-wing-ink/80 leading-relaxed">{daySummary.summary}</p>
          {daySummary.insights.length > 0 && (
            <ul className="space-y-1.5">
              {daySummary.insights.map((insight, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-wing-ink/70">
                  <span className="text-[#c79a00] mt-0.5 flex-shrink-0">•</span>
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          )}
          {daySummary.tip && (
            <div className="bg-white/50 rounded-[14px] px-4 py-3 flex items-start gap-2">
              <Lightbulb size={14} className="text-[#c79a00] mt-0.5 flex-shrink-0" />
              <p className="text-sm font-medium text-wing-ink">{daySummary.tip}</p>
            </div>
          )}
          <button onClick={() => setDaySummary(null)} className="text-xs text-wing-ink/50 underline w-full text-center mt-1">
            הסתר סיכום
          </button>
        </div>
      )}

      {/* Group summary */}
      {groupCheckins.length > 0 && (
        <div className="bg-wing-surface border border-wing-border rounded-[20px] p-5 space-y-4">
          <h3 className="font-bold text-wing-ink">המבנה היום</h3>
          <div className="space-y-4">
            {groupCheckins.map((c) => (
              <div key={c.id} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-wing-ink font-semibold">{c.userName}</span>
                  <div className="flex gap-1.5 text-wing-muted text-xs flex-wrap justify-end">
                    <span>💧 {c.waterGlasses.toFixed(1)}L</span>
                    <span>🥦 {c.vegetablesServings}</span>
                    {c.steps ? <span>👟 {c.steps.toLocaleString()}</span> : null}
                    {c.workout?.done && <span>🏋️</span>}
                    {c.weightKg ? <span>⚖️ {c.weightKg}</span> : null}
                    <span>{moods.find((m) => m.value === c.mood)?.emoji}</span>
                  </div>
                </div>
                {c.workout?.done && c.workout.description && (
                  <p className="text-xs text-green-700 bg-green-50 rounded-xl px-3 py-1.5">
                    🏋️ {c.workout.description}{c.workout.caloriesBurned ? ` · ${c.workout.caloriesBurned} קק"ל` : ""}
                  </p>
                )}
                {c.notes && (
                  <p className="text-xs text-wing-muted bg-wing-elevated border border-wing-border rounded-xl px-3 py-1.5 italic">
                    &ldquo;{c.notes}&rdquo;
                  </p>
                )}
                {(c.encouragements ?? []).map((enc, i) => (
                  <div key={i} className="text-sm bg-wing-soft rounded-xl px-3 py-2">
                    <span className="font-medium text-wing-primary">{enc.authorName}: </span>
                    <span className="text-wing-ink">{enc.text}</span>
                  </div>
                ))}
                {(c.userId !== firebaseUser?.uid || (c.encouragements ?? []).length > 0) && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={encourageTexts[c.id] ?? ""}
                      onChange={(e) => setEncourageTexts((prev) => ({ ...prev, [c.id]: e.target.value }))}
                      placeholder={c.userId === firebaseUser?.uid ? "הגב / תודה..." : `עודד את ${c.userName.split(" ")[0]}...`}
                      className="flex-1 text-sm border border-wing-border rounded-xl px-3 py-2 bg-wing-elevated focus:outline-none focus:ring-2 focus:ring-wing-ink text-wing-ink"
                      onKeyDown={(e) => { if (e.key === "Enter") handleSendEncouragement(c); }}
                    />
                    <Button size="sm" onClick={() => handleSendEncouragement(c)} loading={sendingEnc === c.id} disabled={!encourageTexts[c.id]?.trim()}>
                      שלח
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CheckinPage() {
  return (
    <Suspense>
      <CheckinPageInner />
    </Suspense>
  );
}
