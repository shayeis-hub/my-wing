"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/lib/i18n";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { calculateBMI, getBMICategory, calculateBMR, calculateTDEE, calculateDailyTarget } from "@/lib/utils/calculator";
import { updateUserProfile } from "@/lib/firebase/auth";
import toast from "react-hot-toast";
import type { UserProfile } from "@/types";

function InfoModal({ topic, onClose, t }: { topic: string; onClose: () => void; t: (k: string) => unknown }) {
  const titleKey = topic === "BMI" ? "calc_info_bmi_title" : topic === "TDEE" ? "calc_info_tdee_title" : "calc_info_daily_title";
  const bodyKey  = topic === "BMI" ? "calc_info_bmi_body"  : topic === "TDEE" ? "calc_info_tdee_body"  : "calc_info_daily_body";
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm space-y-3" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-wing-ink text-lg">{t(titleKey) as string}</h3>
        <p className="text-sm text-wing-muted leading-relaxed">{t(bodyKey) as string}</p>
        <button onClick={onClose} className="w-full py-2.5 bg-wing-primary text-white rounded-2xl font-medium text-sm">
          {t("calc_got_it") as string}
        </button>
      </div>
    </div>
  );
}

export default function CalculatorPage() {
  const { user, firebaseUser } = useAuth();
  const { t } = useLanguage();

  const activityOptions: { value: UserProfile["activityLevel"]; label: string; desc: string }[] = [
    { value: "sedentary", label: t("activity_sedentary") as string, desc: t("activity_desc_sedentary") as string },
    { value: "light",     label: t("activity_light") as string,     desc: t("activity_desc_light") as string },
    { value: "moderate",  label: t("activity_moderate") as string,  desc: t("activity_desc_moderate") as string },
    { value: "active",    label: t("activity_active") as string,    desc: t("activity_desc_active") as string },
    { value: "very_active", label: t("activity_very_active") as string, desc: t("activity_desc_very_active") as string },
  ];

  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [targetWeight, setTargetWeight] = useState("");
  const [gender, setGender] = useState<UserProfile["gender"]>("male");
  const [activity, setActivity] = useState<UserProfile["activityLevel"]>("moderate");
  const [activeInfo, setActiveInfo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{
    bmi: number; bmr: number; tdee: number; dailyTarget: number;
    bmiCategory: { label: string; color: string };
  } | null>(null);

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

  function calculate() {
    const profile: UserProfile = {
      age: +age, heightCm: +height, weightKg: +weight,
      targetWeightKg: +targetWeight || +weight,
      gender, activityLevel: activity, dailyCalorieTarget: 2000,
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
        age: +age, heightCm: +height, weightKg: +weight,
        targetWeightKg: +targetWeight || +weight,
        gender, activityLevel: activity, dailyCalorieTarget: result.dailyTarget,
      };
      await updateUserProfile(firebaseUser.uid, profile);
      toast.success(t("calc_saved") as string);
    } catch {
      toast.error(t("save_error") as string);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 space-y-4">
      {activeInfo && (
        <InfoModal topic={activeInfo} onClose={() => setActiveInfo(null)} t={t as (k: string) => unknown} />
      )}

      <div className="pt-4">
        <h1 className="text-xl font-bold text-wing-ink">{t("calc_title") as string}</h1>
        <p className="text-sm text-wing-muted">{t("calc_subtitle") as string}</p>
      </div>

      <Card className="space-y-4">
        <div className="flex gap-3">
          {(["male", "female"] as const).map((g) => (
            <button
              key={g}
              onClick={() => setGender(g)}
              className={`flex-1 py-2.5 rounded-2xl text-sm font-medium transition-all ${
                gender === g ? "bg-wing-primary text-white" : "bg-wing-elevated text-wing-muted"
              }`}
            >
              {g === "male" ? t("gender_male") as string : t("gender_female") as string}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input label={t("calc_age") as string} type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="30" dir="ltr" />
          <Input label={t("calc_height") as string} type="number" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="170" dir="ltr" />
          <Input label={t("calc_weight") as string} type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="80" dir="ltr" />
          <Input label={t("calc_target_weight") as string} type="number" value={targetWeight} onChange={(e) => setTargetWeight(e.target.value)} placeholder="70" dir="ltr" />
        </div>

        <div>
          <p className="text-sm font-medium text-wing-ink mb-2">{t("calc_activity_level") as string}</p>
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
          {t("calc_calculate") as string}
        </Button>
      </Card>

      {result && (
        <Card className="space-y-4">
          <h3 className="font-bold text-wing-ink">{t("calc_results_title") as string}</h3>
          <p className="text-xs text-wing-subtle">{t("calc_results_hint") as string}</p>
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
              <p className="text-xs text-wing-muted mt-0.5">{t("calc_basal") as string}</p>
            </div>
            <button
              onClick={() => setActiveInfo("TDEE")}
              className="bg-wing-elevated rounded-2xl p-3 text-center active:scale-95 transition-transform"
            >
              <p className="text-2xl font-bold text-wing-ink">{result.tdee}</p>
              <p className="text-xs text-wing-subtle mt-1">TDEE ⓘ</p>
              <p className="text-xs text-wing-muted mt-0.5">{t("calc_with_activity") as string}</p>
            </button>
            <button
              onClick={() => setActiveInfo("daily")}
              className="bg-wing-elevated rounded-2xl p-3 text-center active:scale-95 transition-transform"
            >
              <p className="text-2xl font-bold text-wing-heat">{result.dailyTarget}</p>
              <p className="text-xs text-wing-subtle mt-1">{t("calc_daily_goal") as string} ⓘ</p>
              <p className="text-xs text-wing-heat mt-0.5">{t("calc_for_loss") as string}</p>
            </button>
          </div>

          <Button variant="secondary" onClick={saveToProfile} loading={saving} className="w-full">
            {t("calc_save_profile") as string}
          </Button>
        </Card>
      )}
    </div>
  );
}
