"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { calculateBMI, getBMICategory, calculateTDEE, calculateDailyTarget } from "@/lib/utils/calculator";
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

export default function CalculatorPage() {
  const { user, firebaseUser } = useAuth();

  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [targetWeight, setTargetWeight] = useState("");
  const [gender, setGender] = useState<UserProfile["gender"]>("male");
  const [activity, setActivity] = useState<UserProfile["activityLevel"]>("moderate");

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
    const tdee = calculateTDEE(profile);
    const dailyTarget = calculateDailyTarget(profile);
    setResult({ bmi, tdee, dailyTarget, bmiCategory });
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
      <div className="pt-4">
        <h1 className="text-xl font-bold text-slate-800">מחשבון אישי</h1>
        <p className="text-sm text-slate-500">חישוב BMI, BMR ו-TDEE</p>
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
                  : "bg-slate-100 text-slate-600"
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
          <p className="text-sm font-medium text-slate-700 mb-2">רמת פעילות</p>
          <div className="space-y-2">
            {activityOptions.map((o) => (
              <button
                key={o.value}
                onClick={() => setActivity(o.value)}
                className={`w-full text-right px-4 py-2.5 rounded-2xl border transition-all text-sm ${
                  activity === o.value
                    ? "border-wing-primary bg-wing-soft text-wing-primary"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span className="font-medium">{o.label}</span>
                <span className="text-slate-400 text-xs mr-2">{o.desc}</span>
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
          <h3 className="font-bold text-slate-800">התוצאות שלך</h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-slate-50 rounded-2xl p-3">
              <p className={`text-2xl font-bold ${result.bmiCategory.color}`}>{result.bmi}</p>
              <p className="text-xs text-slate-400 mt-1">BMI</p>
              <p className={`text-xs font-medium mt-0.5 ${result.bmiCategory.color}`}>{result.bmiCategory.label}</p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-3">
              <p className="text-2xl font-bold text-slate-700">{result.tdee}</p>
              <p className="text-xs text-slate-400 mt-1">TDEE</p>
              <p className="text-xs text-slate-500 mt-0.5">קק&quot;ל/יום</p>
            </div>
            <div className="bg-wing-soft rounded-2xl p-3">
              <p className="text-2xl font-bold text-wing-primary">{result.dailyTarget}</p>
              <p className="text-xs text-slate-400 mt-1">יעד יומי</p>
              <p className="text-xs text-wing-primary mt-0.5">קק&quot;ל/יום</p>
            </div>
          </div>

          <Button variant="secondary" onClick={saveToProfile} loading={saving} className="w-full">
            שמור לפרופיל שלי
          </Button>
        </Card>
      )}
    </div>
  );
}
