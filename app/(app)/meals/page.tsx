"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMeals } from "@/hooks/useMeals";
import { useWing } from "@/hooks/useWing";
import { MealCard } from "@/components/meals/MealCard";
import { MealCamera } from "@/components/meals/MealCamera";
import { Button } from "@/components/ui/Button";
import { addMeal } from "@/lib/firebase/firestore";
import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";
import toast from "react-hot-toast";
import { Camera, ChevronDown, PenLine, Clock } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import type { MealAnalysis } from "@/types";
import { nanoid } from "@/lib/utils/nanoid";

const mealTypes = ["breakfast", "lunch", "dinner", "snack"] as const;
const mealTypeLabels = { breakfast: "בוקר", lunch: "צהריים", dinner: "ערב", snack: "חטיף" };

export default function MealsPage() {
  const { user, firebaseUser } = useAuth();
  const { meals, loading } = useMeals(user?.wingId);
  const { wing } = useWing(user?.wingId);
  const [selectedUserId, setSelectedUserId] = useState<string | "all">("all");
  const [showCamera, setShowCamera] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualDescription, setManualDescription] = useState("");
  const [manualCalories, setManualCalories] = useState("");
  const [manualProtein, setManualProtein] = useState("");
  const [manualCarbs, setManualCarbs] = useState("");
  const [manualFat, setManualFat] = useState("");
  const [manualMealType, setManualMealType] = useState<typeof mealTypes[number]>("lunch");
  const [savingManual, setSavingManual] = useState(false);
  const [pendingAnalysis, setPendingAnalysis] = useState<{
    analysis: MealAnalysis;
    imageDataUrl: string;
  } | null>(null);
  const [mealType, setMealType] = useState<typeof mealTypes[number]>("lunch");
  const [mealTime, setMealTime] = useState(() => format(new Date(), "HH:mm"));
  const [manualTime, setManualTime] = useState(() => format(new Date(), "HH:mm"));
  const [saving, setSaving] = useState(false);
  const [hint, setHint] = useState("");
  const [reanalyzing, setReanalyzing] = useState(false);
  const [editingValues, setEditingValues] = useState(false);

  // Reset time to now when opening a new meal entry
  useEffect(() => {
    if (showCamera) setMealTime(format(new Date(), "HH:mm"));
  }, [showCamera]);

  async function handleAnalysis(analysis: MealAnalysis, imageDataUrl: string) {
    setShowCamera(false);
    setHint("");
    setEditingValues(false);
    setPendingAnalysis({ analysis, imageDataUrl });
  }

  async function saveManualMeal() {
    if (!user || !firebaseUser || !user.wingId || !manualDescription.trim()) return;
    setSavingManual(true);
    try {
      await addMeal(user.wingId, {
        wingId: user.wingId,
        userId: firebaseUser.uid,
        userName: user.displayName,
        analysis: {
          description: manualDescription.trim(),
          calories: Number(manualCalories) || 0,
          protein: Number(manualProtein) || 0,
          carbs: Number(manualCarbs) || 0,
          fat: Number(manualFat) || 0,
          fiber: 0,
          items: [],
          healthScore: 5,
        },
        mealType: manualMealType,
        mealTime: manualTime,
      });
      toast.success("הארוחה נשמרה! 🍽️");
      setShowManualForm(false);
      setManualDescription("");
      setManualCalories("");
      setManualProtein("");
      setManualCarbs("");
      setManualFat("");
    } catch {
      toast.error("שגיאה בשמירת הארוחה");
    } finally {
      setSavingManual(false);
    }
  }

  async function handleReanalyze() {
    if (!pendingAnalysis || !hint.trim()) return;
    setReanalyzing(true);
    try {
      const base64 = pendingAnalysis.imageDataUrl.split(",")[1];
      const mediaType = pendingAnalysis.imageDataUrl.startsWith("data:image/png") ? "image/png" : "image/jpeg";
      const res = await fetch("/api/ai/analyze-meal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64Image: base64, mediaType, hint: hint.trim() }),
      });
      if (!res.ok) throw new Error();
      const analysis: MealAnalysis = await res.json();
      setPendingAnalysis((prev) => prev ? { ...prev, analysis } : null);
      setHint("");
      toast.success("הניתוח עודכן ✨");
    } catch {
      toast.error("שגיאה בניתוח מחדש");
    } finally {
      setReanalyzing(false);
    }
  }

  function updateAnalysisField(field: keyof MealAnalysis, value: string | number) {
    setPendingAnalysis((prev) =>
      prev ? { ...prev, analysis: { ...prev.analysis, [field]: value } } : null
    );
  }

  async function saveMeal() {
    if (!pendingAnalysis || !user || !firebaseUser || !user.wingId) return;
    setSaving(true);
    try {
      let imageURL: string | undefined;
      if (pendingAnalysis.imageDataUrl) {
        const storage = getStorage();
        const imageRef = ref(storage, `meals/${firebaseUser.uid}/${nanoid()}.jpg`);
        await uploadString(imageRef, pendingAnalysis.imageDataUrl, "data_url");
        imageURL = await getDownloadURL(imageRef);
      }

      await addMeal(user.wingId, {
        wingId: user.wingId,
        userId: firebaseUser.uid,
        userName: user.displayName,
        ...(imageURL ? { imageURL } : {}),
        analysis: pendingAnalysis.analysis,
        mealType,
        mealTime,
      });

      toast.success("הארוחה נשמרה! 🍽️");
      setPendingAnalysis(null);
    } catch {
      toast.error("שגיאה בשמירת הארוחה");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="pt-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">ארוחות המבנה</h1>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => { setShowManualForm(true); setPendingAnalysis(null); }}
            className="flex items-center gap-1.5"
          >
            <PenLine size={16} />
            ידנית
          </Button>
          <Button
            size="sm"
            onClick={() => setShowCamera(true)}
            className="flex items-center gap-1.5"
          >
            <Camera size={16} />
            צלם
          </Button>
        </div>
      </div>

      {/* Member tabs */}
      {wing && wing.members.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          <button
            onClick={() => setSelectedUserId("all")}
            className={`flex-shrink-0 text-sm px-4 py-1.5 rounded-full font-medium transition-all ${
              selectedUserId === "all"
                ? "bg-wing-primary text-white"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            הכל
          </button>
          {wing.members.map((m) => (
            <button
              key={m.uid}
              onClick={() => setSelectedUserId(m.uid)}
              className={`flex-shrink-0 text-sm px-4 py-1.5 rounded-full font-medium transition-all ${
                selectedUserId === m.uid
                  ? "bg-wing-primary text-white"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              {m.uid === firebaseUser?.uid ? "שלי" : m.displayName.split(" ")[0]}
            </button>
          ))}
        </div>
      )}

      {/* Manual meal form */}
      {showManualForm && (
        <div className="bg-white rounded-3xl shadow-card p-4 space-y-3 border-2 border-slate-200">
          <h2 className="font-bold text-slate-800">הוספה ידנית 📝</h2>
          <input
            type="text"
            value={manualDescription}
            onChange={(e) => setManualDescription(e.target.value)}
            placeholder="שם / תיאור הארוחה"
            className="w-full border border-slate-200 rounded-2xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-wing-primary"
          />
          <div className="grid grid-cols-2 gap-2">
            {([
              ["manualCalories", "🔥 קק\"ל", manualCalories, setManualCalories],
              ["manualProtein", "🥩 חלבון g", manualProtein, setManualProtein],
              ["manualCarbs", "🌾 פחמימות g", manualCarbs, setManualCarbs],
              ["manualFat", "🧈 שומן g", manualFat, setManualFat],
            ] as [string, string, string, (v: string) => void][]).map(([key, label, val, setter]) => (
              <label key={key} className="flex flex-col gap-0.5">
                <span className="text-xs text-slate-400">{label}</span>
                <input
                  type="number"
                  value={val}
                  onChange={(e) => setter(e.target.value)}
                  className="border border-slate-200 rounded-xl px-2 py-1.5 text-sm w-full"
                  inputMode="numeric"
                />
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <select
                value={manualMealType}
                onChange={(e) => setManualMealType(e.target.value as typeof mealTypes[number])}
                className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-wing-primary"
              >
                {mealTypes.map((t) => (
                  <option key={t} value={t}>{mealTypeLabels[t]}</option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute left-3 top-3 text-slate-400 pointer-events-none" />
            </div>
            <div className="relative flex-shrink-0">
              <Clock size={14} className="absolute right-3 top-3.5 text-slate-400 pointer-events-none" />
              <input
                type="time"
                value={manualTime}
                onChange={(e) => setManualTime(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-2xl pr-8 pl-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-wing-primary w-28"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setShowManualForm(false)} className="flex-1">בטל</Button>
            <Button onClick={saveManualMeal} loading={savingManual} disabled={!manualDescription.trim()} className="flex-1">שמור</Button>
          </div>
        </div>
      )}

      {/* Pending analysis review */}
      {pendingAnalysis && (
        <div className="bg-white rounded-3xl shadow-card p-4 space-y-4 border-2 border-wing-accent">
          <h2 className="font-bold text-slate-800">תוצאות הניתוח ✨</h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={pendingAnalysis.imageDataUrl}
            alt="meal"
            className="w-full h-44 object-cover rounded-2xl"
          />
          <div className="space-y-2 text-sm text-slate-700">
            <p className="font-medium">{pendingAnalysis.analysis.description}</p>

            {editingValues ? (
              <div className="grid grid-cols-2 gap-2">
                {(["calories", "protein", "carbs", "fat"] as const).map((field) => (
                  <label key={field} className="flex flex-col gap-0.5">
                    <span className="text-xs text-slate-400">
                      {field === "calories" ? "🔥 קק\"ל" : field === "protein" ? "🥩 חלבון g" : field === "carbs" ? "🌾 פחמימות g" : "🧈 שומן g"}
                    </span>
                    <input
                      type="number"
                      value={pendingAnalysis.analysis[field] as number}
                      onChange={(e) => updateAnalysisField(field, Number(e.target.value))}
                      className="border border-slate-200 rounded-xl px-2 py-1 text-sm w-full"
                    />
                  </label>
                ))}
              </div>
            ) : (
              <div className="flex gap-4 text-xs text-slate-500">
                <span>🔥 {pendingAnalysis.analysis.calories} קק&quot;ל</span>
                <span>🥩 {pendingAnalysis.analysis.protein}g חלבון</span>
                <span>🌾 {pendingAnalysis.analysis.carbs}g פחמ&apos;</span>
                <span>🧈 {pendingAnalysis.analysis.fat}g שומן</span>
              </div>
            )}

            <button
              onClick={() => setEditingValues((v) => !v)}
              className="text-xs text-slate-400 underline"
            >
              {editingValues ? "סגור עריכה" : "ערוך ערכים ידנית"}
            </button>

            {pendingAnalysis.analysis.tips && (
              <p className="text-xs text-wing-primary bg-wing-soft px-3 py-2 rounded-xl">
                💡 {pendingAnalysis.analysis.tips}
              </p>
            )}
          </div>

          {/* Re-analyze with hint */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={hint}
                onChange={(e) => setHint(e.target.value)}
                placeholder="לא מדויק? כתוב מה יש בצלחת..."
                className="flex-1 border border-slate-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-wing-primary"
                onKeyDown={(e) => { if (e.key === "Enter") handleReanalyze(); }}
              />
              <Button
                size="sm"
                onClick={handleReanalyze}
                loading={reanalyzing}
                disabled={!hint.trim()}
              >
                נתח מחדש
              </Button>
            </div>
          </div>

          {/* Meal type + time */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <select
                value={mealType}
                onChange={(e) => setMealType(e.target.value as typeof mealTypes[number])}
                className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-wing-primary"
              >
                {mealTypes.map((t) => (
                  <option key={t} value={t}>{mealTypeLabels[t]}</option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute left-3 top-3 text-slate-400 pointer-events-none" />
            </div>
            <div className="relative flex-shrink-0">
              <Clock size={14} className="absolute right-3 top-3.5 text-slate-400 pointer-events-none" />
              <input
                type="time"
                value={mealTime}
                onChange={(e) => setMealTime(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-2xl pr-8 pl-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-wing-primary w-28"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setPendingAnalysis(null)} className="flex-1">
              בטל
            </Button>
            <Button onClick={saveMeal} loading={saving} className="flex-1">
              שמור במבנה
            </Button>
          </div>
        </div>
      )}

      {/* Meals feed */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-slate-100 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : meals.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <div className="text-4xl mb-3">🍽️</div>
          <p>עדיין אין ארוחות. צלם את הארוחה הראשונה!</p>
        </div>
      ) : (
        <MealsByDate
          meals={selectedUserId === "all" ? meals : meals.filter((m) => m.userId === selectedUserId)}
          currentUserId={firebaseUser?.uid}
          currentUserName={user?.displayName}
        />
      )}

      {showCamera && (
        <MealCamera
          onAnalysis={handleAnalysis}
          onCancel={() => setShowCamera(false)}
        />
      )}
    </div>
  );
}

// ── Grouped meals by date ──────────────────────────────────────────

import type { Meal } from "@/types";

function dateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const dayName = format(d, "EEEE", { locale: he });
  const dateFormatted = format(d, "d/M/yy");
  return `${dayName} ${dateFormatted}`;
}

function MealsByDate({
  meals,
  currentUserId,
  currentUserName,
}: {
  meals: Meal[];
  currentUserId?: string;
  currentUserName?: string;
}) {
  // Group meals by date string yyyy-MM-dd
  const groups: { date: string; meals: Meal[] }[] = [];
  const seen = new Map<string, Meal[]>();

  for (const meal of meals) {
    const d = meal.createdAt?.toDate?.();
    const key = d ? format(d, "yyyy-MM-dd") : "unknown";
    if (!seen.has(key)) {
      seen.set(key, []);
      groups.push({ date: key, meals: seen.get(key)! });
    }
    seen.get(key)!.push(meal);
  }

  // Today's group is open by default, past days are closed
  const todayKey = format(new Date(), "yyyy-MM-dd");
  const [openDates, setOpenDates] = useState<Set<string>>(new Set([todayKey]));

  function toggle(date: string) {
    setOpenDates((prev) => {
      const next = new Set(prev);
      next.has(date) ? next.delete(date) : next.add(date);
      return next;
    });
  }

  return (
    <div className="space-y-3">
      {groups.map(({ date, meals: dayMeals }) => {
        const isOpen = openDates.has(date);
        const isTodays = date === todayKey;

        return (
          <div key={date}>
            {isTodays ? (
              // Today: always show meals directly, no toggle
              <div className="space-y-3">
                <p className="text-sm font-semibold text-slate-500 px-1">היום</p>
                {dayMeals.map((meal) => (
                  <MealCard key={meal.id} meal={meal} currentUserId={currentUserId} currentUserName={currentUserName} />
                ))}
              </div>
            ) : (
              // Past days: collapsible
              <div className="rounded-3xl overflow-hidden border border-slate-200 bg-white">
                <button
                  onClick={() => toggle(date)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="text-right">
                    <p className="font-semibold text-slate-700 text-base">{dateLabel(date)}</p>
                  </div>
                  <ChevronDown
                    size={20}
                    className={`text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isOpen && (
                  <div className="px-3 pb-3 space-y-3 border-t border-slate-100 pt-3">
                    {dayMeals.map((meal) => (
                      <MealCard key={meal.id} meal={meal} currentUserId={currentUserId} currentUserName={currentUserName} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
