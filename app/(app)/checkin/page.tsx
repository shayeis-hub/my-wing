"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/lib/i18n";
import { useTrialLock } from "@/hooks/useTrialLock";
import { g } from "@/lib/utils/gender";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import {
  saveCheckin, getTodayCheckin, getWingCheckins, getWingSteps, addEncouragement, saveWeightLog, updateUserWeight, getUserTodayMeals, toggleCheckinReaction,
} from "@/lib/firebase/firestore";
import { Reactions } from "@/components/ui/Reactions";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { enUS } from "date-fns/locale";
import { useSearchParams } from "next/navigation";
import type { DailyCheckin, Encouragement, ReactionType, Workout } from "@/types";
import { Droplets, Leaf, Footprints, Dumbbell, Smile, Scale, Pencil, Moon, Lightbulb, Timer } from "lucide-react";
import { SPORTS, getSport, computeWorkoutCalories, usesDistance, paceFeedback, type Intensity } from "@/lib/fitness/workout";

const MOOD_COLORS = ["#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e"];

async function sendEncouragementPush(targetUserId: string, authorId: string, authorName: string, text: string, date?: string) {
  await fetch("/api/notifications/encouragement", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      targetUserId,
      authorId,
      authorName,
      message: text,
      link: date ? `/checkin?date=${date}` : "/checkin",
    }),
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
  const { t, lang, gender } = useLanguage();
  const trialLocked = useTrialLock();

  const moods = [
    { value: 1, color: MOOD_COLORS[0], label: t("mood_1") },
    { value: 2, color: MOOD_COLORS[1], label: t("mood_2") },
    { value: 3, color: MOOD_COLORS[2], label: t("mood_3") },
    { value: 4, color: MOOD_COLORS[3], label: t("mood_4") },
    { value: 5, color: MOOD_COLORS[4], label: t("mood_5") },
  ];

  const searchParams = useSearchParams();
  const paramDate = searchParams.get("date");
  const [myCheckin, setMyCheckin] = useState<DailyCheckin | null>(null);
  const [groupCheckins, setGroupCheckins] = useState<DailyCheckin[]>([]);
  const [water, setWater] = useState(0);
  const [vegetables, setVegetables] = useState(0);
  const [mood, setMood] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [notes, setNotes] = useState("");
  const [steps, setSteps] = useState("");
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [wfType, setWfType] = useState("running");
  const [wfIntensity, setWfIntensity] = useState<Intensity>("moderate");
  const [wfDuration, setWfDuration] = useState("");
  const [wfDistance, setWfDistance] = useState("");
  const [wfOpen, setWfOpen] = useState(false);
  const [weight, setWeight] = useState("");
  const [saving, setSaving] = useState(false);
  const [encourageTexts, setEncourageTexts] = useState<Record<string, string>>({});
  const [sendingEnc, setSendingEnc] = useState<string | null>(null);
  const [closingDay, setClosingDay] = useState(false);
  const [daySummary, setDaySummary] = useState<{ summary: string; insights: string[]; tip: string } | null>(null);
  const [ewOpen, setEwOpen] = useState("");
  const [ewClose, setEwClose] = useState("");
  const [ewManual, setEwManual] = useState(false);
  const [stepsEditing, setStepsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<"essential" | "advanced">("essential");
  const [autosaveState, setAutosaveState] = useState<"idle" | "saving" | "saved">("idle");
  const autosaveTimer = useRef<NodeJS.Timeout | null>(null);
  const initialLoadDone = useRef(false);
  // Android WebView IME fix: track composition state to avoid React clearing text mid-type
  const notesComposing = useRef(false);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  // Sync notes state → DOM when loaded from Firestore (but never while user is typing)
  useEffect(() => {
    if (notesRef.current && !notesComposing.current && document.activeElement !== notesRef.current) {
      notesRef.current.value = notes;
    }
  }, [notes]);
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
        setWorkouts(c.workouts ?? (c.workout?.done ? [c.workout] : []));
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

      // Load meals separately — update ewClose from last meal; preserve saved ewOpen
      getUserTodayMeals(user.wingId!, uid, selectedDate)
        .then((meals) => applyMealTimes(meals, c?.eatingWindow?.open))
        .catch(() => {/* non-critical */});

      // Allow autosave after initial data load
      setTimeout(() => { initialLoadDone.current = true; }, 500);
    });
  }, [user?.wingId, firebaseUser, today]);

  function applyMealTimes(meals: import("@/types").Meal[], savedOpen?: string) {
    if (!meals.length) return;
    // Prefer user-specified mealTime ("HH:mm") over Firestore createdAt timestamp
    const toHHMM = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    const times = meals.map((m) => {
      if (m.mealTime) return m.mealTime; // "HH:mm" string — use as-is
      const ts = m.createdAt as unknown as { toDate?: () => Date; _seconds?: number };
      const d = ts?.toDate ? ts.toDate() : new Date((ts?._seconds ?? 0) * 1000);
      return toHHMM(d);
    }).filter(Boolean).sort();
    if (!times.length) return;
    // Preserve manually saved open time; only auto-set if not yet saved
    if (!savedOpen) setEwOpen(times[0]);
    // Always update close to latest meal time
    setEwClose(times[times.length - 1]);
  }

  function calcEwDuration(open: string, close: string): number {
    if (!open || !close) return 0;
    const [oh, om] = open.split(":").map(Number);
    const [ch, cm] = close.split(":").map(Number);
    const mins = (ch * 60 + cm) - (oh * 60 + om);
    return Math.max(0, Math.round(mins / 6) / 10);
  }

  // ── Autosave ────────────────────────────────────────────────────
  const performAutosave = useCallback(async () => {
    if (!user?.wingId || !firebaseUser) return;
    setAutosaveState("saving");
    try {
      const trimmedNotes = notes.trim();
      const stepsNum = steps ? parseInt(steps) : undefined;
      const weightNum = weight ? parseFloat(weight) : undefined;

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
        workouts,
        workout: workouts.length > 0 ? { ...workouts[0], done: true } : { done: false },
      });

      if (weightNum && user.wingId) {
        try {
          await saveWeightLog(user.wingId, { userId: firebaseUser.uid, userName: user.displayName, date: selectedDate, weightKg: weightNum });
          await updateUserWeight(firebaseUser.uid, weightNum);
        } catch { /* non-critical */ }
      }

      setAutosaveState("saved");
      setTimeout(() => setAutosaveState((s) => s === "saved" ? "idle" : s), 2000);
    } catch {
      setAutosaveState("idle");
    }
  }, [user, firebaseUser, water, vegetables, mood, notes, steps, weight, workouts, ewOpen, ewClose, selectedDate]);

  // Debounced trigger — runs after 1s of no changes
  useEffect(() => {
    if (!initialLoadDone.current) return; // skip on first load
    if (trialLocked) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => { performAutosave(); }, 1000);
    return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current); };
  }, [water, vegetables, mood, notes, steps, weight, workouts, ewOpen, ewClose, performAutosave, trialLocked]);

  async function handleSave() {
    if (!user?.wingId || !firebaseUser) return;
    setSaving(true);
    try {
      const trimmedNotes = notes.trim();
      const stepsNum = steps ? parseInt(steps) : undefined;
      const weightNum = weight ? parseFloat(weight) : undefined;

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
        workouts,
        workout: workouts.length > 0 ? { ...workouts[0], done: true } : { done: false },
      });

      if (weightNum && user.wingId) {
        try {
          await saveWeightLog(user.wingId, { userId: firebaseUser.uid, userName: user.displayName, date: selectedDate, weightKg: weightNum });
          await updateUserWeight(firebaseUser.uid, weightNum);
        } catch { /* non-critical */ }
      }


      toast.success(g(user?.profile?.gender, t("checkin_saved_ok_m"), t("checkin_saved_ok_f")));
      const refreshed = await getTodayCheckin(user.wingId, firebaseUser.uid, selectedDate);
      if (refreshed) setMyCheckin(refreshed);
    } catch {
      toast.error(t("checkin_save_error"));
    } finally {
      setSaving(false);
    }
  }

  function addWorkout() {
    const durationMin = parseInt(wfDuration);
    if (!durationMin || durationMin <= 0) return;
    const weightKg = user?.profile?.weightKg ?? 70;
    const sport = getSport(wfType);
    const distNum = wfDistance ? parseFloat(wfDistance) : undefined;
    const byDistance = usesDistance(wfType, distNum);
    const caloriesBurned = computeWorkoutCalories({
      type: wfType, durationMin, weightKg, intensity: wfIntensity, distance: distNum,
    });

    // Build a human description: "ריצה · 9 ק"מ · 5:30 דק'/ק"מ · 55 דק'" or
    // "אימון כוח · בינוני · 45 דק'".
    const label = sport.he; // display label follows app language below via lang check
    const enLabel = sport.en;
    const dispLabel = lang === "he" ? label : enLabel;
    const parts: string[] = [dispLabel];
    if (byDistance && distNum) {
      const distStr = sport.distanceUnit === "m" ? `${distNum} ${lang === "he" ? "מ'" : "m"}` : `${distNum} ${lang === "he" ? "ק\"מ" : "km"}`;
      parts.push(distStr);
      const pace = paceFeedback(wfType, distNum, durationMin, lang);
      if (pace) parts.push(pace);
    } else {
      const intensityLabel = wfIntensity === "light" ? t("checkin_workout_light") : wfIntensity === "moderate" ? t("checkin_workout_moderate") : t("checkin_workout_intense");
      parts.push(intensityLabel as string);
    }
    parts.push(`${durationMin} ${t("minutes_short")}`);

    // Store distance in km (swimming metres → km) for the step double-count guard.
    const distanceKm = byDistance && distNum
      ? (sport.distanceUnit === "m" ? distNum / 1000 : distNum)
      : undefined;

    setWorkouts(prev => [...prev, {
      done: true,
      type: wfType,
      ...(byDistance ? {} : { intensity: wfIntensity }),
      durationMinutes: durationMin,
      ...(distanceKm ? { distanceKm } : {}),
      description: parts.join(" · "),
      caloriesBurned,
    }]);
    setWfDuration("");
    setWfDistance("");
    setWfOpen(false);
  }

  function removeWorkout(idx: number) {
    setWorkouts(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleSendEncouragement(checkin: DailyCheckin) {
    const text = encourageTexts[checkin.id]?.trim();
    if (!text || !user || !firebaseUser) return;
    setSendingEnc(checkin.id);
    try {
      const enc: Encouragement = { authorId: firebaseUser.uid, authorName: user.displayName, text, createdAt: Date.now() };
      await addEncouragement(user.wingId!, checkin.id, enc);
      await sendEncouragementPush(checkin.userId, firebaseUser.uid, user.displayName, text, checkin.date);
      setGroupCheckins((prev) => prev.map((c) => c.id === checkin.id ? { ...c, encouragements: [...(c.encouragements ?? []), enc] } : c));
      setEncourageTexts((prev) => ({ ...prev, [checkin.id]: "" }));
      toast.success(t("checkin_enc_sent"));
    } catch {
      toast.error(t("checkin_enc_error"));
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
        body: JSON.stringify({ wingId: user.wingId, userId: firebaseUser.uid, date: today, checkin: myCheckin, userProfile: user.profile, lang }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 503 || body?.error === "OVERLOADED") {
          toast.error(t("checkin_summary_busy"), { duration: 5000 });
        } else {
          toast.error(t("checkin_summary_error"));
        }
        return;
      }
      const summary = await res.json();
      setDaySummary(summary);
      toast.success(t("checkin_summary_created"));
    } catch {
      toast.error(t("checkin_summary_error"));
    } finally {
      setClosingDay(false);
    }
  }

  // Progress: count filled fields out of 6
  const filledFields = [
    mood !== 3,          // mood changed from default
    water > 0,
    vegetables > 0,
    !!steps,
    workouts.length > 0,
    !!(notes || weight || ewOpen),
  ].filter(Boolean).length;
  const totalFields = 6;
  const progressPct = Math.round((filledFields / totalFields) * 100);

  // ── Derived values for the workout add-form ──────────────────────────────
  const wfSport = getSport(wfType);
  const wfDistNum = wfDistance ? parseFloat(wfDistance) : undefined;
  const wfDurNum = wfDuration ? parseInt(wfDuration) : 0;
  const wfByDistance = usesDistance(wfType, wfDistNum);
  const wfPace = wfByDistance && wfDistNum && wfDurNum > 0 ? paceFeedback(wfType, wfDistNum, wfDurNum, lang) : "";
  const wfPreviewCals = wfDurNum > 0
    ? computeWorkoutCalories({ type: wfType, durationMin: wfDurNum, weightKg: user?.profile?.weightKg ?? 70, intensity: wfIntensity, distance: wfDistNum })
    : 0;

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="pt-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-wing-ink tracking-tight">{t("checkin_title")}</h1>
          <p className="font-mono text-xs tracking-[0.2em] uppercase text-wing-muted mt-0.5">
            {format(new Date(selectedDate + "T12:00:00"), "EEEE, d MMMM", { locale: lang === "he" ? he : enUS })}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 mt-1 shrink-0">
          <span className="font-black text-wing-ink tabular text-sm">{progressPct}%</span>
          <div className="w-16 h-1.5 bg-wing-border rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%`, background: "linear-gradient(90deg, #f5dd4b, #ff6b47)" }}
            />
          </div>
          {autosaveState !== "idle" && (
            <span className={`font-mono text-[10px] tracking-widest uppercase ${autosaveState === "saved" ? "text-green-600" : "text-wing-muted"}`}>
              {autosaveState === "saved" ? t("checkin_autosave_saved") as string : t("checkin_autosave_saving") as string}
            </span>
          )}
        </div>
        {false && autosaveState !== "idle" && (
          <span className={`font-mono text-[10px] tracking-widest uppercase px-2 py-1 rounded-full mt-1 ${autosaveState === "saved" ? "text-green-700 bg-green-50 border border-green-200" : "text-wing-muted bg-wing-elevated border border-wing-border"}`}>
            {autosaveState === "saved" ? t("checkin_autosave_saved") as string : t("checkin_autosave_saving") as string}
          </span>
        )}
      </div>
      {isRetro && (
        <span className="inline-block text-xs text-wing-heat font-medium bg-wing-elevated border border-wing-border px-3 py-1 rounded-full">
          <Pencil size={12} className="inline mr-1" />מילוי רטרואקטיבי
        </span>
      )}

      {/* 1. Mood — narrow strip */}
      <SectionCard className="py-3">
        <div className="flex items-center gap-2 mb-3">
          <Smile size={14} className="text-wing-honey" />
          <span className="font-semibold text-wing-ink text-sm">{t("checkin_mood")}</span>
        </div>
        <div className="flex justify-between gap-1">
          {moods.map((m) => (
            <button
              key={m.value}
              onClick={() => setMood(m.value as 1 | 2 | 3 | 4 | 5)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-[12px] transition-all active:scale-95 ${
                mood === m.value ? "scale-105" : "hover:bg-wing-elevated"
              }`}
              style={mood === m.value ? { background: "linear-gradient(135deg, #fff3b8, #ffc89a)" } : {}}
            >
              <span className="w-5 h-5 rounded-full inline-block" style={{ background: m.color }} />
              <MonoLabel>{m.label}</MonoLabel>
            </button>
          ))}
        </div>
      </SectionCard>

      {/* 2. 2×2 grid: water, vegetables, steps, workout */}
      <div className="grid grid-cols-2 gap-3">

        {/* Water */}
        <div className="bg-wing-surface border border-wing-border rounded-[20px] p-4 flex flex-col items-center gap-2">
          <div className="flex items-center gap-1.5 self-start">
            <Droplets size={14} className="text-blue-400" />
            <span className="text-xs font-semibold text-wing-ink">{t("checkin_water")}</span>
          </div>
          <span className="font-black text-wing-ink tabular" style={{ fontSize: 32, letterSpacing: "-0.04em", lineHeight: 1 }}>
            {water.toFixed(1)} <span className="text-sm font-normal text-wing-muted">{lang === "he" ? "ליטר" : "L"}</span>
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setWater((v) => Math.max(0, Math.round((v - 0.1) * 10) / 10))}
              className="w-9 h-9 bg-wing-elevated border border-wing-border rounded-full text-lg font-bold text-wing-muted transition-colors active:scale-95"
            >−</button>
            <button
              onClick={() => setWater((v) => Math.min(4, Math.round((v + 0.1) * 10) / 10))}
              className="w-9 h-9 rounded-full text-lg font-bold text-wing-ink transition-all active:scale-95"
              style={{ background: "linear-gradient(135deg, #fff3b8, #ffc89a)" }}
            >+</button>
          </div>
        </div>

        {/* Vegetables */}
        <div className="bg-wing-surface border border-wing-border rounded-[20px] p-4 flex flex-col items-center gap-2">
          <div className="flex items-center gap-1.5 self-start">
            <Leaf size={14} className="text-green-500" />
            <span className="text-xs font-semibold text-wing-ink">{t("checkin_veg")}</span>
          </div>
          <span className="font-black text-wing-ink tabular" style={{ fontSize: 32, letterSpacing: "-0.04em", lineHeight: 1 }}>
            {vegetables} <span className="text-sm font-normal text-wing-muted">{lang === "he" ? "מנות" : "srv"}</span>
          </span>
          <span className="text-[10px] text-wing-subtle text-center leading-tight">
            {lang === "he" ? "חצי צלחת = מנה אחת" : "½ plate = 1 serving"}
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setVegetables((v) => Math.max(0, v - 1))}
              className="w-9 h-9 bg-wing-elevated border border-wing-border rounded-full text-lg font-bold text-wing-muted transition-colors active:scale-95"
            >−</button>
            <button
              onClick={() => setVegetables((v) => Math.min(6, v + 1))}
              className="w-9 h-9 rounded-full text-lg font-bold text-wing-ink transition-all active:scale-95"
              style={{ background: "linear-gradient(135deg, #f5dd4b, #ff6b47)" }}
            >+</button>
          </div>
        </div>

        {/* Steps */}
        <div
          className="bg-wing-surface border border-wing-border rounded-[20px] p-4 flex flex-col gap-2 cursor-pointer"
          onClick={() => setStepsEditing(true)}
        >
          <div className="flex items-center gap-1.5">
            <Footprints size={14} className="text-wing-muted" />
            <span className="text-xs font-semibold text-wing-ink">{t("checkin_steps")}</span>
          </div>
          {stepsEditing ? (
            <input
              type="number"
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
              onBlur={() => setStepsEditing(false)}
              placeholder="0"
              inputMode="numeric"
              autoFocus
              className="w-full px-2 py-1 bg-wing-elevated border border-wing-border rounded-[10px] text-sm text-wing-ink focus:outline-none focus:ring-2 focus:ring-wing-ink"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="font-black text-wing-ink tabular" style={{ fontSize: 28, letterSpacing: "-0.04em", lineHeight: 1 }}>
              {steps ? parseInt(steps).toLocaleString() : <span className="text-wing-subtle text-sm font-normal">{t("checkin_steps_ph")}</span>}
            </span>
          )}
          {!stepsEditing && (
            <span className="text-[10px] text-wing-subtle">{lang === "he" ? (gender === "female" ? "לחצי לעריכה" : "לחץ לעריכה") : "tap to edit"}</span>
          )}
        </div>

        {/* Workout */}
        {workouts.length > 0 ? (
          <button
            onClick={() => setWfOpen(o => !o)}
            className="bg-wing-surface border border-wing-border rounded-[20px] p-4 flex flex-col gap-2 text-right w-full"
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-1.5">
                <Dumbbell size={14} className="text-wing-muted" />
                <span className="text-xs font-semibold text-wing-ink">{t("checkin_workout")}</span>
              </div>
              <span className="text-xs font-bold text-green-700">{workouts.length}×</span>
            </div>
            <span className="text-xs text-green-700 font-medium">
              {workouts.reduce((s, w) => s + (w.caloriesBurned ?? 0), 0)} {lang === "he" ? "קק\"ל" : "kcal"}
            </span>
          </button>
        ) : (
          <div className="bg-wing-surface border border-wing-border rounded-[20px] p-4 flex flex-col items-center gap-2">
            <div className="flex items-center gap-1.5 self-start">
              <Dumbbell size={14} className="text-wing-muted" />
              <span className="text-xs font-semibold text-wing-ink">{t("checkin_workout")}</span>
            </div>
            <button
              onClick={() => setWfOpen(true)}
              className="w-9 h-9 rounded-full text-lg font-bold text-wing-ink transition-all active:scale-95"
              style={{ background: "linear-gradient(135deg, #f5dd4b, #ff6b47)" }}
            >+</button>
            <span className="text-[10px] text-wing-subtle">{lang === "he" ? "הוסף אימון" : "Add workout"}</span>
          </div>
        )}
      </div>

      {/* Workout panel — expands when tile clicked or workouts exist */}
      {(wfOpen || workouts.length > 0) && (
        <SectionCard>
          <div className="space-y-3">
            {/* List of added workouts */}
            {workouts.map((w, i) => (
              <div key={i} className="flex items-center justify-between bg-green-50 rounded-[14px] px-3 py-2">
                <span className="text-sm text-green-800 font-medium flex items-center gap-2">
                  <Dumbbell size={13} />
                  {w.description}{w.caloriesBurned ? ` · ${w.caloriesBurned} ${lang === "he" ? "קק\"ל" : "kcal"}` : ""}
                </span>
                <button onClick={() => removeWorkout(i)} className="text-red-400 hover:text-red-600 text-lg leading-none px-1">✕</button>
              </div>
            ))}

            {/* Add form */}
            {wfOpen && (
              <div className="space-y-3 pt-1">
                {workouts.length > 0 && (
                  <p className="text-xs text-wing-muted font-semibold">{lang === "he" ? "הוסף אימון נוסף:" : "Add another workout:"}</p>
                )}

                {/* Sport picker — a dropdown so the list doesn't fill the screen */}
                <select
                  value={wfType}
                  onChange={(e) => { setWfType(e.target.value); setWfDistance(""); }}
                  className="w-full px-4 py-2.5 bg-wing-elevated border border-wing-border rounded-[14px] text-sm text-wing-ink font-semibold focus:outline-none focus:ring-2 focus:ring-wing-ink"
                >
                  {SPORTS.map((s) => (
                    <option key={s.value} value={s.value}>{lang === "he" ? s.he : s.en}</option>
                  ))}
                </select>

                {/* Duration — always */}
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={wfDuration}
                    onChange={(e) => setWfDuration(e.target.value)}
                    placeholder={t("checkin_workout_dur")}
                    inputMode="numeric"
                    className="flex-1 px-4 py-2.5 bg-wing-elevated border border-wing-border rounded-[14px] text-sm text-wing-ink placeholder:text-wing-subtle focus:outline-none focus:ring-2 focus:ring-wing-ink"
                  />
                  <span className="text-sm text-wing-muted shrink-0">{t("checkin_workout_min")}</span>
                </div>

                {/* Distance — distance sports only, optional */}
                {wfSport.model === "distance" && (
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={wfDistance}
                      onChange={(e) => setWfDistance(e.target.value)}
                      placeholder={lang === "he" ? "מרחק (לא חובה)" : "Distance (optional)"}
                      inputMode="decimal"
                      step="any"
                      className="flex-1 px-4 py-2.5 bg-wing-elevated border border-wing-border rounded-[14px] text-sm text-wing-ink placeholder:text-wing-subtle focus:outline-none focus:ring-2 focus:ring-wing-ink"
                    />
                    <span className="text-sm text-wing-muted shrink-0">
                      {wfSport.distanceUnit === "m" ? (lang === "he" ? "מ'" : "m") : (lang === "he" ? "ק\"מ" : "km")}
                    </span>
                  </div>
                )}

                {/* Intensity — only when we're NOT deriving it from distance */}
                {!wfByDistance && (
                  <div className="flex gap-2">
                    {(["light", "moderate", "intense"] as const).map((lvl) => (
                      <button
                        key={lvl}
                        onClick={() => setWfIntensity(lvl)}
                        className={`flex-1 text-sm py-2 rounded-[14px] border-2 transition-all ${
                          wfIntensity === lvl
                            ? "border-wing-ink bg-wing-elevated text-wing-ink font-semibold"
                            : "border-wing-border bg-wing-elevated text-wing-muted"
                        }`}
                      >
                        {lvl === "light" ? t("checkin_workout_light") : lvl === "moderate" ? t("checkin_workout_moderate") : t("checkin_workout_intense")}
                      </button>
                    ))}
                  </div>
                )}

                {/* Pace feedback when a distance was entered */}
                {wfPace && (
                  <p className="text-xs text-wing-muted text-center">
                    {lang === "he" ? "קצב" : "Pace"}: <span dir="ltr" className="tabular-nums font-semibold">{wfPace}</span>
                  </p>
                )}

                {/* Calorie preview */}
                {wfDurNum > 0 && (
                  <p className="text-sm text-green-700 bg-green-50 rounded-[14px] px-4 py-2 text-center font-medium">
                    {(t("checkin_calories_est") as (n: number) => string)(wfPreviewCals)}
                  </p>
                )}

                <button
                  onClick={addWorkout}
                  disabled={wfDurNum <= 0}
                  className="w-full py-2.5 rounded-[14px] font-bold text-wing-ink text-sm disabled:opacity-40 transition-all active:scale-[0.98]"
                  style={{ background: "linear-gradient(135deg, #f5dd4b, #ff6b47)" }}
                >
                  {lang === "he" ? "+ הוסף אימון" : "+ Add workout"}
                </button>
              </div>
            )}

            {/* Toggle form button when panel is open but form is hidden */}
            {!wfOpen && workouts.length > 0 && (
              <button
                onClick={() => setWfOpen(true)}
                className="w-full py-2.5 rounded-[14px] font-bold text-wing-ink text-sm transition-all active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg, #f5dd4b, #ff6b47)" }}
              >
                {lang === "he" ? "+ הוסף עוד אימון" : "+ Add another workout"}
              </button>
            )}
          </div>
        </SectionCard>
      )}

      {/* 3. Eating Window */}
      <SectionCard>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Timer size={16} className="text-wing-muted" />
            <div>
              <span className="font-semibold text-wing-ink">{t("checkin_ew")}</span>
              <p className="text-[10px] text-wing-muted leading-tight">
                {lang === "he" ? "מומלץ 8–10 שעות ביום (8/16 או 10/14)" : "Recommended 8–10 hrs/day (8/16 or 10/14)"}
              </p>
            </div>
          </div>
          <button onClick={() => setEwManual((v) => !v)} className="text-xs text-wing-muted underline">
            {ewManual ? t("checkin_ew_auto") : t("checkin_ew_manual")}
          </button>
        </div>
        {ewOpen && ewClose && !ewManual ? (
          <div className="flex items-center justify-between bg-wing-elevated border border-wing-border rounded-[14px] px-4 py-3">
            <div className="text-center">
              <p className="text-[10px] font-mono text-wing-muted uppercase tracking-wider mb-0.5">{t("checkin_ew_open")}</p>
              <p className="font-black text-wing-ink tabular" style={{ fontSize: 22, letterSpacing: "-0.04em" }}>{ewOpen}</p>
            </div>
            <div className="text-wing-muted text-lg">→</div>
            <div className="text-center">
              <p className="text-[10px] font-mono text-wing-muted uppercase tracking-wider mb-0.5">{t("checkin_ew_close")}</p>
              <p className="font-black text-wing-ink tabular" style={{ fontSize: 22, letterSpacing: "-0.04em" }}>{ewClose}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-mono text-wing-muted uppercase tracking-wider mb-0.5">{t("checkin_ew_duration")}</p>
              <p className="font-black tabular" style={{ fontSize: 22, letterSpacing: "-0.04em", color: "#d4541a" }}>{calcEwDuration(ewOpen, ewClose)}h</p>
            </div>
          </div>
        ) : ewOpen && !ewClose && !ewManual ? (
          <div className="flex items-center gap-3 bg-wing-elevated border border-wing-border rounded-[14px] px-4 py-3">
            <div className="text-center">
              <p className="text-[10px] font-mono text-wing-muted uppercase tracking-wider mb-0.5">{t("checkin_ew_open")}</p>
              <p className="font-black text-wing-ink tabular" style={{ fontSize: 22, letterSpacing: "-0.04em" }}>{ewOpen}</p>
            </div>
            <div className="text-wing-muted text-lg">→</div>
            <p className="text-sm text-wing-subtle">{t("checkin_ew_waiting")}</p>
          </div>
        ) : ewManual ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-wing-muted mb-1.5">{t("checkin_ew_open_label")}</p>
                <input type="time" value={ewOpen} onChange={(e) => setEwOpen(e.target.value)}
                  className="w-full px-3 py-2.5 bg-wing-elevated border border-wing-border rounded-[14px] text-sm text-wing-ink focus:outline-none focus:ring-2 focus:ring-wing-ink" />
              </div>
              <div>
                <p className="text-xs text-wing-muted mb-1.5">{t("checkin_ew_close_label")}</p>
                <input type="time" value={ewClose} onChange={(e) => setEwClose(e.target.value)}
                  className="w-full px-3 py-2.5 bg-wing-elevated border border-wing-border rounded-[14px] text-sm text-wing-ink focus:outline-none focus:ring-2 focus:ring-wing-ink" />
              </div>
            </div>
            {ewOpen && ewClose && (
              <p className="text-sm text-center text-wing-muted">
                {(t("checkin_ew_dur_label") as (h: number) => string)(calcEwDuration(ewOpen, ewClose))}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-wing-subtle text-center py-2">{t("checkin_ew_hint")}</p>
        )}
      </SectionCard>

      {/* 4. Free note */}
      <SectionCard>
        <div className="flex items-center gap-2 mb-3">
          <Pencil size={16} className="text-wing-muted" />
          <span className="font-semibold text-wing-ink">{t("checkin_notes")}</span>
        </div>
        <textarea
          ref={notesRef}
          defaultValue={notes}
          onCompositionStart={() => { notesComposing.current = true; }}
          onCompositionEnd={(e) => {
            notesComposing.current = false;
            setNotes((e.target as HTMLTextAreaElement).value);
          }}
          onChange={(e) => {
            if (!notesComposing.current) setNotes(e.target.value);
          }}
          placeholder={t("checkin_notes_ph") as string}
          rows={3}
          className="w-full px-4 py-3 bg-wing-elevated border border-wing-border rounded-[14px] text-sm text-wing-ink placeholder:text-wing-subtle resize-none focus:outline-none focus:ring-2 focus:ring-wing-ink transition-all"
        />
      </SectionCard>

      {/* 5. Weight */}
      <SectionCard>
        <div className="flex items-center gap-2 mb-3">
          <Scale size={16} className="text-wing-muted" />
          <span className="font-semibold text-wing-ink">{t("checkin_weight")}</span>
          <span className="text-xs text-wing-subtle">({t("optional")})</span>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder={user?.profile?.weightKg ? (t("checkin_weight_ph") as (w: number) => string)(user.profile.weightKg) : t("checkin_weight")}
            inputMode="decimal"
            step="0.1"
            className="flex-1 px-4 py-3 bg-wing-elevated border border-wing-border rounded-[14px] text-sm text-wing-ink placeholder:text-wing-subtle focus:outline-none focus:ring-2 focus:ring-wing-ink"
          />
          <span className="text-sm text-wing-muted shrink-0">{t("checkin_weight_unit")}</span>
        </div>
      </SectionCard>

      {/* 6. Close day */}
      {myCheckin && !daySummary && (
        <button
          onClick={handleCloseDay}
          disabled={closingDay}
          className="w-full py-4 rounded-[14px] font-extrabold text-wing-ink text-base transition-all active:scale-[0.97] disabled:opacity-60 flex items-center justify-center gap-2"
          style={{ background: "linear-gradient(135deg, #f5dd4b, #ff6b47)" }}
        >
          {closingDay
            ? g(user?.profile?.gender, t("checkin_closing_m"), t("checkin_closing_f"))
            : <><Moon size={18} /> {t("checkin_close_day")}</>}
        </button>
      )}

      {!myCheckin && (
        <button
          onClick={() => trialLocked ? window.location.href = "/subscription?expired=1" : handleSave()}
          disabled={saving}
          className="w-full py-4 rounded-[14px] font-extrabold text-wing-ink text-base transition-all active:scale-[0.97] disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, #f5dd4b, #ff6b47)" }}
        >
          {trialLocked
            ? t("trial_upgrade_btn")
            : saving
            ? g(user?.profile?.gender, t("checkin_saving_m"), t("checkin_saving_f"))
            : g(user?.profile?.gender, t("checkin_save_m"), t("checkin_save_f"))}
        </button>
      )}

      {/* Day summary card */}
      {daySummary && (
        <div className="rounded-[20px] p-5 space-y-3" style={{ background: "linear-gradient(135deg, #fff3b8, #ffc89a)" }}>
          <div className="flex items-center gap-2">
            <Moon size={18} className="text-[#c79a00]" />
            <span className="font-black text-wing-ink text-lg">{t("checkin_day_summary")}</span>
          </div>
          <p className="text-sm text-wing-ink/80 leading-relaxed">{daySummary.summary}</p>
          {Array.isArray(daySummary.insights) && daySummary.insights.length > 0 && (
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
            {t("checkin_hide_summary")}
          </button>
        </div>
      )}

      {/* Group summary */}
      {groupCheckins.length > 0 && (
        <div className="bg-wing-surface border border-wing-border rounded-[20px] p-5 space-y-4">
          <h3 className="font-bold text-wing-ink">{t("checkin_group")}</h3>
          <div className="space-y-4">
            {groupCheckins.map((c) => (
              <div key={c.id} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-wing-ink font-semibold">{c.userName}</span>
                  <div className="flex gap-1.5 text-wing-muted text-xs flex-wrap justify-end">
                    <span className="flex items-center gap-0.5"><Droplets size={11} />{c.waterGlasses.toFixed(1)}L</span>
                    <span className="flex items-center gap-0.5"><Leaf size={11} />{c.vegetablesServings}</span>
                    {c.steps ? <span className="flex items-center gap-0.5"><Footprints size={11} />{c.steps.toLocaleString()}</span> : null}
                    {(c.workouts?.length || c.workout?.done) ? <Dumbbell size={11} /> : null}
                    {c.weightKg ? <span className="flex items-center gap-0.5"><Scale size={11} />{c.weightKg}</span> : null}
                    <span className="w-3 h-3 rounded-full inline-block" style={{ background: moods.find((m) => m.value === c.mood)?.color ?? "#eab308" }} />
                  </div>
                </div>
                {(c.workouts?.length ? c.workouts : c.workout?.done ? [c.workout] : []).map((w, wi) => w.description ? (
                  <p key={wi} className="text-xs text-green-700 bg-green-50 rounded-xl px-3 py-1.5">
                    <Dumbbell size={12} className="inline mr-1" />{w.description}{w.caloriesBurned ? ` · ${w.caloriesBurned} ${t("kcal")}` : ""}
                  </p>
                ) : null)}
                {c.notes && (
                  <p className="text-xs text-wing-muted bg-wing-elevated border border-wing-border rounded-xl px-3 py-1.5 italic">
                    &ldquo;{c.notes}&rdquo;
                  </p>
                )}
                {/* Reactions */}
                {firebaseUser && user && (c.userId !== firebaseUser.uid || (c.reactions ?? []).length > 0) && (
                  <Reactions
                    reactions={c.reactions ?? []}
                    currentUserId={firebaseUser.uid}
                    onToggle={async (type: ReactionType) => {
                      if (!user.wingId || c.userId === firebaseUser.uid) return;
                      const next = await toggleCheckinReaction(user.wingId, c.id, c.reactions, firebaseUser.uid, user.displayName, type);
                      setGroupCheckins((prev) => prev.map((x) => x.id === c.id ? { ...x, reactions: next } : x));
                    }}
                  />
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
                      placeholder={c.userId === firebaseUser?.uid ? t("checkin_reply_ph") : (t("checkin_encourage_ph") as (name: string) => string)(c.userName.split(" ")[0])}
                      className="flex-1 text-sm border border-wing-border rounded-xl px-3 py-2 bg-wing-elevated focus:outline-none focus:ring-2 focus:ring-wing-ink text-wing-ink"
                      onKeyDown={(e) => { if (e.key === "Enter") handleSendEncouragement(c); }}
                    />
                    <Button size="sm" onClick={() => handleSendEncouragement(c)} loading={sendingEnc === c.id} disabled={!encourageTexts[c.id]?.trim()}>
                      {t("send")}
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

