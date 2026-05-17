"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { updateUserProfile } from "@/lib/firebase/auth";
import { calculateDailyTarget } from "@/lib/utils/calculator";
import toast from "react-hot-toast";
import type { UserProfile } from "@/types";

const steps = ["מגדר", "גיל וגובה", "משקל", "פעילות"];

const activityOptions: { value: UserProfile["activityLevel"]; label: string; emoji: string; desc: string }[] = [
  { value: "sedentary",  label: "יושבני",    emoji: "🪑", desc: "עבודה ממשרד, כמעט ללא פעילות" },
  { value: "light",      label: "קל",         emoji: "🚶", desc: "1–3 אימונים בשבוע" },
  { value: "moderate",   label: "בינוני",     emoji: "🏃", desc: "3–5 אימונים בשבוע" },
  { value: "active",     label: "פעיל",       emoji: "💪", desc: "6–7 אימונים בשבוע" },
  { value: "very_active",label: "מאוד פעיל", emoji: "🔥", desc: "פעילות אינטנסיבית יומית" },
];

export default function OnboardingPage() {
  const { user, firebaseUser } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [gender, setGender] = useState<UserProfile["gender"]>("male");
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [targetWeight, setTargetWeight] = useState("");
  const [activity, setActivity] = useState<UserProfile["activityLevel"]>("moderate");

  function nextStep() {
    if (step === 0 && !gender) return;
    if (step === 1 && (!age || !height)) { toast.error("מלא את כל השדות"); return; }
    if (step === 2 && (!weight || !targetWeight)) { toast.error("מלא את כל השדות"); return; }
    setStep((s) => s + 1);
  }

  async function handleFinish() {
    if (!firebaseUser) return;
    setSaving(true);
    try {
      const profile: UserProfile = {
        gender,
        age: +age,
        heightCm: +height,
        weightKg: +weight,
        targetWeightKg: +targetWeight,
        activityLevel: activity,
        dailyCalorieTarget: 0,
      };
      profile.dailyCalorieTarget = calculateDailyTarget(profile);
      await updateUserProfile(firebaseUser.uid, profile);
      toast.success("הפרופיל נשמר! ברוך הבא 🎉");
      router.replace("/dashboard");
    } catch {
      toast.error("שגיאה בשמירה, נסה שוב");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-wing-bg flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">

        {/* Header */}
        <div className="text-center space-y-1">
          <div className="text-5xl">🪽</div>
          <h1 className="text-xl font-bold text-slate-800">
            ברוך הבא, {user?.displayName?.split(" ")[0]}!
          </h1>
          <p className="text-sm text-slate-500">כמה פרטים קטנים לפני שמתחילים</p>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step ? "w-6 bg-wing-primary" : i < step ? "w-2 bg-wing-accent" : "w-2 bg-slate-200"
              }`}
            />
          ))}
        </div>

        {/* Step label */}
        <p className="text-center text-xs text-slate-400 font-medium uppercase tracking-wide">
          {steps[step]}
        </p>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-card p-6 space-y-4">

          {/* Step 0 – Gender */}
          {step === 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-700 text-center">מה המגדר שלך?</p>
              <div className="grid grid-cols-2 gap-3">
                {(["male", "female"] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => setGender(g)}
                    className={`flex flex-col items-center py-5 rounded-2xl border-2 transition-all ${
                      gender === g
                        ? "border-wing-primary bg-wing-soft"
                        : "border-slate-200 hover:border-wing-accent"
                    }`}
                  >
                    <span className="text-3xl mb-1">{g === "male" ? "👨" : "👩"}</span>
                    <span className={`text-sm font-semibold ${gender === g ? "text-wing-primary" : "text-slate-600"}`}>
                      {g === "male" ? "זכר" : "נקבה"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 1 – Age & Height */}
          {step === 1 && (
            <div className="space-y-4">
              <Input
                label="גיל"
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="30"
                dir="ltr"
                min="10"
                max="100"
              />
              <Input
                label='גובה (ס"מ)'
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="170"
                dir="ltr"
                min="100"
                max="250"
              />
            </div>
          )}

          {/* Step 2 – Weight */}
          {step === 2 && (
            <div className="space-y-4">
              <Input
                label='משקל נוכחי (ק"ג)'
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="80"
                dir="ltr"
              />
              <Input
                label='משקל יעד (ק"ג)'
                type="number"
                value={targetWeight}
                onChange={(e) => setTargetWeight(e.target.value)}
                placeholder="70"
                dir="ltr"
              />
              {weight && targetWeight && +weight > +targetWeight && (
                <div className="bg-wing-soft rounded-2xl px-4 py-2 text-xs text-wing-primary text-center">
                  יעד: לרדת {(+weight - +targetWeight).toFixed(1)} ק&quot;ג 💪
                </div>
              )}
            </div>
          )}

          {/* Step 3 – Activity */}
          {step === 3 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700 mb-3 text-center">רמת הפעילות שלך?</p>
              {activityOptions.map((o) => (
                <button
                  key={o.value}
                  onClick={() => setActivity(o.value)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all text-right ${
                    activity === o.value
                      ? "border-wing-primary bg-wing-soft"
                      : "border-slate-200 hover:border-wing-accent"
                  }`}
                >
                  <span className="text-xl">{o.emoji}</span>
                  <div>
                    <p className={`text-sm font-semibold ${activity === o.value ? "text-wing-primary" : "text-slate-700"}`}>
                      {o.label}
                    </p>
                    <p className="text-xs text-slate-400">{o.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          {step > 0 && (
            <Button variant="ghost" onClick={() => setStep((s) => s - 1)} className="flex-1">
              חזרה
            </Button>
          )}
          {step < steps.length - 1 ? (
            <Button onClick={nextStep} className="flex-1">
              הבא →
            </Button>
          ) : (
            <Button onClick={handleFinish} loading={saving} className="flex-1">
              בואו נתחיל! 🚀
            </Button>
          )}
        </div>

      </div>
    </div>
  );
}
