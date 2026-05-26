"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/lib/i18n";
import { enUS } from "date-fns/locale";
import { useMeals } from "@/hooks/useMeals";
import { useWing } from "@/hooks/useWing";
import { MealCard } from "@/components/meals/MealCard";
import { MealCamera } from "@/components/meals/MealCamera";
import { UpgradeModal } from "@/components/subscription/UpgradeModal";
import { Button } from "@/components/ui/Button";
import { addMeal } from "@/lib/firebase/firestore";
import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";
import toast from "react-hot-toast";
import { Camera, ChevronDown, PenLine, Clock } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import type { MealAnalysis } from "@/types";
import { nanoid } from "@/lib/utils/nanoid";
import { AdBanner } from "@/components/ads/AdBanner";

const mealTypes = ["breakfast", "lunch", "dinner", "snack"] as const;

export default function MealsPage() {
  const { user, firebaseUser } = useAuth();
  const { meals, loading } = useMeals(user?.wingId);
  const { wing } = useWing(user?.wingId);
  const { t, lang } = useLanguage();
  const mealTypeLabels = {
    breakfast: t("meals_type_breakfast"),
    lunch: t("meals_type_lunch"),
    dinner: t("meals_type_dinner"),
    snack: t("meals_type_snack"),
  };
  const [selectedUserId, setSelectedUserId] = useState<string | "all">("all");
  const [showCamera, setShowCamera] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
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
  const [mealDate, setMealDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [manualTime, setManualTime] = useState(() => format(new Date(), "HH:mm"));
  const [manualDate, setManualDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [saving, setSaving] = useState(false);
  const [hint, setHint] = useState("");
  const [reanalyzing, setReanalyzing] = useState(false);
  const [editingValues, setEditingValues] = useState(false);

  // Reset time/date to now when opening a new meal entry
  useEffect(() => {
    if (showCamera) {
      setMealTime(format(new Date(), "HH:mm"));
      setMealDate(format(new Date(), "yyyy-MM-dd"));
    }
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
        mealDate: manualDate,
      });
      toast.success(t("meals_saved"));
      setShowManualForm(false);
      setManualDescription("");
      setManualCalories("");
      setManualProtein("");
      setManualCarbs("");
      setManualFat("");
    } catch {
      toast.error(t("meals_save_error"));
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
      toast.success(t("meals_reanalyzed"));
    } catch {
      toast.error(t("meals_reanalyze_error"));
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
        mealDate,
      });

      toast.success(t("meals_saved"));
      setPendingAnalysis(null);
    } catch {
      toast.error(t("meals_save_error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="pt-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-wing-ink">{t("meals_wing_title")}</h1>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => { setShowManualForm(true); setPendingAnalysis(null); }}
            className="flex items-center gap-1.5"
          >
            <PenLine size={16} />
            {t("meals_manual_short")}
          </Button>
          <Button
            size="sm"
            onClick={() => setShowCamera(true)}
            className="flex items-center gap-1.5"
          >
            <Camera size={16} />
            {t("meals_photo_short")}
          </Button>
        </div>
      </div>

      {/* Member tabs */}
      {wing && wing.members.length > 1 && firebaseUser && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          <button
            onClick={() => setSelectedUserId("all")}
            className={`flex-shrink-0 whitespace-nowrap text-sm px-4 py-1.5 rounded-full font-medium transition-all ${
              selectedUserId === "all"
                ? "bg-wing-ink text-wing-elevated"
                : "bg-wing-elevated border border-wing-border text-wing-muted"
            }`}
          >
            {t("all")}
          </button>
          {/* "שלי" always uses firebaseUser.uid directly */}
          {(() => {
            const selfMember = wing.members.find((m) => m.uid === firebaseUser.uid);
            const active = selectedUserId === firebaseUser.uid;
            return (
              <button
                onClick={() => setSelectedUserId(firebaseUser.uid)}
                className={`flex-shrink-0 whitespace-nowrap flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full font-medium transition-all ${
                  active ? "bg-wing-ink text-wing-elevated" : "bg-wing-elevated border border-wing-border text-wing-muted"
                }`}
              >
                <Avatar name={selfMember?.displayName ?? t("my")} photoURL={selfMember?.photoURL} size={20} isCurrentUser />
                {t("my")}
              </button>
            );
          })()}
          {wing.members
            .filter((m) => m.uid !== firebaseUser.uid)
            .map((m) => {
              const active = selectedUserId === m.uid;
              return (
                <button
                  key={m.uid}
                  onClick={() => setSelectedUserId(m.uid)}
                  className={`flex-shrink-0 whitespace-nowrap flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full font-medium transition-all ${
                    active ? "bg-wing-ink text-wing-elevated" : "bg-wing-elevated border border-wing-border text-wing-muted"
                  }`}
                >
                  <Avatar name={m.displayName} photoURL={m.photoURL} size={20} />
                  {m.displayName.split(" ")[0]}
                </button>
              );
            })}
        </div>
      )}

      {/* Manual meal form */}
      {showManualForm && (
        <div className="bg-white rounded-3xl shadow-card p-4 space-y-3 border-2 border-wing-border">
          <h2 className="font-bold text-wing-ink">{t("meals_manual_form_title")}</h2>
          <input
            type="text"
            value={manualDescription}
            onChange={(e) => setManualDescription(e.target.value)}
            placeholder={t("meals_desc_ph")}
            className="w-full border border-wing-border rounded-2xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-wing-ink"
          />
          <div className="grid grid-cols-2 gap-2">
            {([
              ["manualCalories", "🔥 קק\"ל", manualCalories, setManualCalories],
              ["manualProtein", "🥩 חלבון g", manualProtein, setManualProtein],
              ["manualCarbs", "🌾 פחמימות g", manualCarbs, setManualCarbs],
              ["manualFat", "🧈 שומן g", manualFat, setManualFat],
            ] as [string, string, string, (v: string) => void][]).map(([key, label, val, setter]) => (
              <label key={key} className="flex flex-col gap-0.5">
                <span className="text-xs text-wing-subtle">{label}</span>
                <input
                  type="number"
                  value={val}
                  onChange={(e) => setter(e.target.value)}
                  className="border border-wing-border rounded-xl px-2 py-1.5 text-sm w-full"
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
                className="w-full appearance-none bg-wing-elevated border border-wing-border rounded-2xl px-4 py-2.5 text-sm text-wing-ink focus:outline-none focus:ring-2 focus:ring-wing-ink"
              >
                {mealTypes.map((t) => (
                  <option key={t} value={t}>{mealTypeLabels[t]}</option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute left-3 top-3 text-wing-subtle pointer-events-none" />
            </div>
            <div className="relative flex-shrink-0">
              <Clock size={14} className="absolute right-3 top-3.5 text-wing-subtle pointer-events-none" />
              <input
                type="time"
                value={manualTime}
                onChange={(e) => setManualTime(e.target.value)}
                className="bg-wing-elevated border border-wing-border rounded-2xl pr-8 pl-3 py-2.5 text-sm text-wing-ink focus:outline-none focus:ring-2 focus:ring-wing-ink w-28"
              />
            </div>
          </div>
          <input
            type="date"
            value={manualDate}
            max={format(new Date(), "yyyy-MM-dd")}
            onChange={(e) => setManualDate(e.target.value)}
            className="w-full bg-wing-elevated border border-wing-border rounded-2xl px-3 py-2.5 text-sm text-wing-ink focus:outline-none focus:ring-2 focus:ring-wing-ink"
          />
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setShowManualForm(false)} className="flex-1">{t("cancel")}</Button>
            <Button onClick={saveManualMeal} loading={savingManual} disabled={!manualDescription.trim()} className="flex-1">{t("save")}</Button>
          </div>
        </div>
      )}

      {/* Pending analysis review */}
      {pendingAnalysis && (
        <div className="bg-white rounded-3xl shadow-card p-4 space-y-4 border-2 border-wing-border">
          <h2 className="font-bold text-wing-ink">{t("meals_analysis_title")}</h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={pendingAnalysis.imageDataUrl}
            alt="meal"
            className="w-full h-44 object-cover rounded-2xl"
          />
          <div className="space-y-2 text-sm text-wing-ink">
            <p className="font-medium">{pendingAnalysis.analysis.description}</p>

            {editingValues ? (
              <div className="grid grid-cols-2 gap-2">
                {(["calories", "protein", "carbs", "fat"] as const).map((field) => (
                  <label key={field} className="flex flex-col gap-0.5">
                    <span className="text-xs text-wing-subtle">
                      {field === "calories" ? "🔥 קק\"ל" : field === "protein" ? "🥩 חלבון g" : field === "carbs" ? "🌾 פחמימות g" : "🧈 שומן g"}
                    </span>
                    <input
                      type="number"
                      value={pendingAnalysis.analysis[field] as number}
                      onChange={(e) => updateAnalysisField(field, Number(e.target.value))}
                      className="border border-wing-border rounded-xl px-2 py-1 text-sm w-full"
                    />
                  </label>
                ))}
              </div>
            ) : (
              <div className="flex gap-4 text-xs text-wing-muted">
                <span>🔥 {pendingAnalysis.analysis.calories} קק&quot;ל</span>
                <span>🥩 {pendingAnalysis.analysis.protein}g חלבון</span>
                <span>🌾 {pendingAnalysis.analysis.carbs}g פחמ&apos;</span>
                <span>🧈 {pendingAnalysis.analysis.fat}g שומן</span>
              </div>
            )}

            <button
              onClick={() => setEditingValues((v) => !v)}
              className="text-xs text-wing-subtle underline"
            >
              {editingValues ? t("meals_close_edit") : t("meals_edit_values")}
            </button>

            {pendingAnalysis.analysis.tips && (
              <p className="text-xs text-wing-heat bg-wing-elevated px-3 py-2 rounded-xl">
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
                placeholder={t("meals_hint_ph")}
                className="flex-1 border border-wing-border rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-wing-ink"
                onKeyDown={(e) => { if (e.key === "Enter") handleReanalyze(); }}
              />
              <Button
                size="sm"
                onClick={handleReanalyze}
                loading={reanalyzing}
                disabled={!hint.trim()}
              >
                {t("meals_reanalyze")}
              </Button>
            </div>
          </div>

          {/* Meal type + time */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <select
                value={mealType}
                onChange={(e) => setMealType(e.target.value as typeof mealTypes[number])}
                className="w-full appearance-none bg-wing-elevated border border-wing-border rounded-2xl px-4 py-2.5 text-sm text-wing-ink focus:outline-none focus:ring-2 focus:ring-wing-ink"
              >
                {mealTypes.map((t) => (
                  <option key={t} value={t}>{mealTypeLabels[t]}</option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute left-3 top-3 text-wing-subtle pointer-events-none" />
            </div>
            <div className="relative flex-shrink-0">
              <Clock size={14} className="absolute right-3 top-3.5 text-wing-subtle pointer-events-none" />
              <input
                type="time"
                value={mealTime}
                onChange={(e) => setMealTime(e.target.value)}
                className="bg-wing-elevated border border-wing-border rounded-2xl pr-8 pl-3 py-2.5 text-sm text-wing-ink focus:outline-none focus:ring-2 focus:ring-wing-ink w-28"
              />
            </div>
          </div>
          <input
            type="date"
            value={mealDate}
            max={format(new Date(), "yyyy-MM-dd")}
            onChange={(e) => setMealDate(e.target.value)}
            className="w-full bg-wing-elevated border border-wing-border rounded-2xl px-3 py-2.5 text-sm text-wing-ink focus:outline-none focus:ring-2 focus:ring-wing-ink"
          />

          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setPendingAnalysis(null)} className="flex-1">
              {t("cancel")}
            </Button>
            <Button onClick={saveMeal} loading={saving} className="flex-1">
              {t("meals_save_to_wing")}
            </Button>
          </div>
        </div>
      )}

      {/* Ad Banner */}
      <AdBanner className="rounded-2xl" />

      {/* Meals feed */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-wing-elevated rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : meals.length === 0 ? (
        <div className="text-center py-12 text-wing-subtle">
          <div className="text-4xl mb-3">🍽️</div>
          <p>{t("meals_no_meals_feed")}</p>
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
          onLimitReached={() => { setShowCamera(false); setShowUpgrade(true); }}
          userId={firebaseUser?.uid}
          userEmail={firebaseUser?.email}
        />
      )}

      {showUpgrade && (
        <UpgradeModal
          onClose={() => setShowUpgrade(false)}
          limitReached
        />
      )}
    </div>
  );
}

// ── Grouped meals by date ──────────────────────────────────────────

import type { Meal } from "@/types";

function dateLabel(dateStr: string, lang: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const locale = lang === "he" ? he : enUS;
  const dayName = format(d, "EEEE", { locale });
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
  const { t, lang } = useLanguage();
  // Group meals by date string yyyy-MM-dd
  const groups: { date: string; meals: Meal[] }[] = [];
  const seen = new Map<string, Meal[]>();

  for (const meal of meals) {
    // Prefer explicit mealDate, fall back to createdAt date
    let key = meal.mealDate;
    if (!key) {
      const d = meal.createdAt?.toDate?.();
      if (!d) continue;
      key = format(d, "yyyy-MM-dd");
    }
    if (!seen.has(key)) {
      seen.set(key, []);
      groups.push({ date: key, meals: seen.get(key)! });
    }
    seen.get(key)!.push(meal);
  }
  // Sort groups newest first
  groups.sort((a, b) => b.date.localeCompare(a.date));

  for (const group of groups) {
    group.meals.sort((a, b) => {
      if (!a.mealTime && !b.mealTime) return 0;
      if (!a.mealTime) return 1;
      if (!b.mealTime) return -1;
      return a.mealTime.localeCompare(b.mealTime);
    });
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
              // Today: hero card first (most recent), then compact rows
              <div className="space-y-3">
                <p className="text-sm font-semibold text-wing-muted px-1">{t("meals_today")}</p>
                {/* Most recent meal = hero at top */}
                <MealCard
                  key={dayMeals[dayMeals.length - 1].id}
                  meal={dayMeals[dayMeals.length - 1]}
                  currentUserId={currentUserId}
                  currentUserName={currentUserName}
                  hero
                />
                {/* Remaining meals as compact rows */}
                {dayMeals.slice(0, dayMeals.length - 1).reverse().map((meal) => (
                  <MealCard key={meal.id} meal={meal} currentUserId={currentUserId} currentUserName={currentUserName} />
                ))}
              </div>
            ) : (
              // Past days: collapsible
              <div className="rounded-3xl overflow-hidden border border-wing-border bg-white">
                <button
                  onClick={() => toggle(date)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-wing-elevated transition-colors"
                >
                  <div className="text-right">
                    <p className="font-semibold text-wing-ink text-base">{dateLabel(date, lang)}</p>
                  </div>
                  <ChevronDown
                    size={20}
                    className={`text-wing-subtle transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isOpen && (
                  <div className="px-3 pb-3 space-y-3 border-t border-wing-border pt-3">
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

