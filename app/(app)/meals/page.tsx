"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMeals } from "@/hooks/useMeals";
import { MealCard } from "@/components/meals/MealCard";
import { MealCamera } from "@/components/meals/MealCamera";
import { Button } from "@/components/ui/Button";
import { addMeal } from "@/lib/firebase/firestore";
import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";
import toast from "react-hot-toast";
import { Camera, ChevronDown } from "lucide-react";
import type { MealAnalysis } from "@/types";
import { nanoid } from "@/lib/utils/nanoid";

const mealTypes = ["breakfast", "lunch", "dinner", "snack"] as const;
const mealTypeLabels = { breakfast: "בוקר", lunch: "צהריים", dinner: "ערב", snack: "חטיף" };

export default function MealsPage() {
  const { user, firebaseUser } = useAuth();
  const { meals, loading } = useMeals(user?.wingId);
  const [showCamera, setShowCamera] = useState(false);
  const [pendingAnalysis, setPendingAnalysis] = useState<{
    analysis: MealAnalysis;
    imageDataUrl: string;
  } | null>(null);
  const [mealType, setMealType] = useState<typeof mealTypes[number]>("lunch");
  const [saving, setSaving] = useState(false);
  const [hint, setHint] = useState("");
  const [reanalyzing, setReanalyzing] = useState(false);
  const [editingValues, setEditingValues] = useState(false);

  async function handleAnalysis(analysis: MealAnalysis, imageDataUrl: string) {
    setShowCamera(false);
    setHint("");
    setEditingValues(false);
    setPendingAnalysis({ analysis, imageDataUrl });
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
      const storage = getStorage();
      const imageRef = ref(storage, `meals/${firebaseUser.uid}/${nanoid()}.jpg`);
      await uploadString(imageRef, pendingAnalysis.imageDataUrl, "data_url");
      const imageURL = await getDownloadURL(imageRef);

      await addMeal(user.wingId, {
        wingId: user.wingId,
        userId: firebaseUser.uid,
        userName: user.displayName,
        imageURL,
        analysis: pendingAnalysis.analysis,
        mealType,
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
        <Button
          size="sm"
          onClick={() => setShowCamera(true)}
          className="flex items-center gap-1.5"
        >
          <Camera size={16} />
          צלם
        </Button>
      </div>

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

          {/* Meal type selector */}
          <div className="relative">
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
        <div className="space-y-3">
          {meals.map((meal) => (
            <MealCard key={meal.id} meal={meal} currentUserId={firebaseUser?.uid} currentUserName={user?.displayName} />
          ))}
        </div>
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
