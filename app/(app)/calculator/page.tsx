"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { calculateBMI, getBMICategory, calculateBMR, calculateTDEE, calculateDailyTarget } from "@/lib/utils/calculator";
import { updateUserProfile } from "@/lib/firebase/auth";
import toast from "react-hot-toast";
import type { UserProfile } from "@/types";

const activityOptions: { value: UserProfile["activityLevel"]; label: string; desc: string }[] = [
  { value: "sedentary", label: "יושבני", desc: "עבודה ממשרד, כמעט ללא פעילות" },
  { value: "light", label: "קל", desc: "1-3 אימונים בשבוע" },
  { value: "moderate", label: "בינוני", desc: "3-5 אימונים בשבוע" },
  { value: "active", label: "פעיל", desc: "6-7 אימונים בשבוע" },
  { value: "very_active", label: "מאוד פעיל", desc: "פעילות אינטנסיבית יומית" },
];

const infoTexts: Record<string, { title: string; body: string }> = {
  BMI: {
    title: "BMI – מדד מסת הגוף",
    body: "מדד המחשב את היחס בין משקל לגובה. ערך תקין הוא 18.5–24.9. מתחת ל-18.5 הוא תת משקל, 25–29.9 הוא עודף משקל, ומעל 30 נחשב להשמנה.",
  },
  TDEE: {
    title: "TDEE – סך ההוצאה האנרגטית היומית",
    body: "כמות הקלוריות שהגוף שלך שורף ביממה כולל פעילות גופנית. זה ה-BMR שלך כפול מכפיל הפעילות. אם תאכל בדיוק כמו ה-TDEE שלך – משקלך יישאר יציב.",
  },
  "יעד יומי": {
    title: "יעד קלורי יומי",
    body: "הכמות המומלצת לצרוך כדי להגיע ליעד המשקל שלך. מחושב על בסיס ה-TDEE עם גירעון קלורי מתון (כ-500 קק\"ל ביום) לירידה של כחצי ק\"ג בשבוע.",
  },
};

function InfoModal({ topic, onClose }: { topic: string; onClose: () => void }) {
  const info = infoTexts[topic];
  if (!info) return null;
  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl p-6 w-full max-w-sm space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-bold text-wing-ink text-lg">{info.title}</h3>
        <p className="text-sm text-wing-muted leading-relaxed">{info.body}</p>
        <button
          onClick={onClose}
          className="w-full py-2.5 bg-wing-primary text-white rounded-2xl font-medium text-sm"
        >
          הבנתי
        </button>
      </div>
    </div>
  );
}

export default function CalculatorPage() {
  const { user, firebaseUser } = useAuth();

  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [targetWeight, setTargetWeight] = useState("");
  const [gender, setGender] = useState<UserProfile["gender"]>("male");
  const [activity, setActivity] = useState<UserProfile["activityLevel"]>("moderate");
  const [activeInfo, setActiveInfo] = useState<string | null>(null);

  useEffect(() => {
    const p = user?.profile;
    if (!p || !p.age) return;
    setAge(String(p.age));
    setHeight(String(p.heightCm));
    setWeight(String(p.weightKg));
    setTargetWeight(String(p.targetWeightKg));
    setGender(p.gender);
    setActivity(p.activityLevel);
  }, [user]);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{
    bmi: number;
    bmr: number;
    tdee: number;
    dailyTarget: number;
    bmiCategory: { label: string; color: string };
  } | null>(null);

  function calculate() {
    const profile: UserProfile = {
      age: +age,
      heightCm: +height,
      weightKg: +weight,
      targetWeightKg: +targetWeight || +weight,
      gender,
      activityLevel: activity,
      dailyCalorieTarget: 2000,
    };
    const bmi = calculateBMI(+weight, +height);
    const bmiCategory = getBMICategory(bmi);
    const bmr = Math.round(calculateBMR(profile));
    const tdee = calculateTDEE(profile);
    const dailyTarget = calculateDailyTarget(profile);
    setResult({ bmi, bmr, tdee, dailyTarget, bmiCategory });
  }

  async function saveToProfile() {
    if (!firebaseUser || !result) return;
    setSaving(true);
    try {
      const profile: UserProfile = {
        age: +age,
        heightCm: +height,
        weightKg: +weight,
        targetWeightKg: +targetWeight || +weight,
        gender,
        activityLevel: activity,
        dailyCalorieTarget: result.dailyTarget,
      };
      await updateUserProfile(firebaseUser.uid, profile);
      toast.success("הפרופיל עודכן!");
    } catch {
      toast.error("שגיאה בשמירה");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 space-y-4">
      {activeInfo && (
        <InfoModal topic={activeInfo} onClose={() => setActiveInfo(null)} />
      )}

      <div className="pt-4">
        <h1 className="text-xl font-bold text-wing-ink">מחשבון אישי</h1>
        <p className="text-sm text-wing-muted">חישוב BMI, BMR ו-TDEE</p>
      </div>

      <Card className="space-y-4">
        <div className="flex gap-3">
          {(["male", "female"] as const).map((g) => (
            <button
              key={g}
              onClick={() => setGender(g)}
              className={`flex-1 py-2.5 rounded-2xl text-sm font-medium transition-all ${
                gender === g
                  ? "bg-wing-primary text-white"
                  : "bg-wing-elevated text-wing-muted"
              }`}
            >
              {g === "male" ? "זכר" : "נקבה"}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input label="גיל" type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="30" dir="ltr" />
          <Input label='גובה (ס"מ)' type="number" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="170" dir="ltr" />
          <Input label='משקל (ק"ג)' type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="80" dir="ltr" />
          <Input label='יעד משקל (ק"ג)' type="number" value={targetWeight} onChange={(e) => setTargetWeight(e.target.value)} placeholder="70" dir="ltr" />
        </div>

        <div>
          <p className="text-sm font-medium text-wing-ink mb-2">רמת פעילות</p>
          <div className="space-y-2">
            {activityOptions.map((o) => (
              <button
                key={o.value}
                onClick={() => setActivity(o.value)}
                className={`w-full text-right px-4 py-2.5 rounded-2xl border transition-all text-sm ${
                  activity === o.value
                    ? "border-wing-primary bg-wing-elevated text-wing-heat"
                    : "border-wing-border bg-white text-wing-ink hover:bg-wing-elevated"
                }`}
              >
                <span className="font-medium">{o.label}</span>
                <span className="text-wing-subtle text-xs mr-2">{o.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <Button onClick={calculate} size="lg" className="w-full">
          חשב
        </Button>
      </Card>

      {result && (
        <Card className="space-y-4">
          <h3 className="font-bold text-wing-ink">התוצאות שלך</h3>
          <p className="text-xs text-wing-subtle">לחץ על כל נתון לקבלת הסבר</p>
          <div className="grid grid-cols-2 gap-3 text-center">
            <button
              onClick={() => setActiveInfo("BMI")}
              className="bg-wing-elevated rounded-2xl p-3 text-center active:scale-95 transition-transform"
            >
              <p className={`text-2xl font-bold ${result.bmiCategory.color}`}>{result.bmi}</p>
              <p className="text-xs text-wing-subtle mt-1">BMI ⓘ</p>
              <p className={`text-xs font-medium mt-0.5 ${result.bmiCategory.color}`}>{result.bmiCategory.label}</p>
            </button>
            <div className="bg-wing-elevated rounded-2xl p-3 text-center">
              <p className="text-2xl font-bold text-wing-ink">{result.bmr}</p>
              <p className="text-xs text-wing-subtle mt-1">BMR</p>
              <p className="text-xs text-wing-muted mt-0.5">חילוף חומרים בסיסי</p>
            </div>
            <button
              onClick={() => setActiveInfo("TDEE")}
              className="bg-wing-elevated rounded-2xl p-3 text-center active:scale-95 transition-transform"
            >
              <p className="text-2xl font-bold text-wing-ink">{result.tdee}</p>
              <p className="text-xs text-wing-subtle mt-1">TDEE ⓘ</p>
              <p className="text-xs text-wing-muted mt-0.5">כולל פעילות</p>
            </button>
            <button
              onClick={() => setActiveInfo("יעד יומי")}
              className="bg-wing-elevated rounded-2xl p-3 text-center active:scale-95 transition-transform"
            >
              <p className="text-2xl font-bold text-wing-heat">{result.dailyTarget}</p>
              <p className="text-xs text-wing-subtle mt-1">יעד יומי ⓘ</p>
              <p className="text-xs text-wing-heat mt-0.5">לירידה במשקל</p>
            </button>
          </div>

          <Button variant="secondary" onClick={saveToProfile} loading={saving} className="w-full">
            שמור לפרופיל שלי
          </Button>
        </Card>
      )}
    </div>
  );
}
