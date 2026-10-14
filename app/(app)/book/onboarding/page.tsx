"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/lib/i18n";
import { updateUserProfile } from "@/lib/firebase/auth";
import { calculateDailyTarget } from "@/lib/utils/calculator";
import { getHabitByOrder } from "@/lib/book/habits";
import { lbToKg, ftInToCm, usesImperial } from "@/lib/utils/units";
import { Button } from "@/components/ui/Button";
import toast from "react-hot-toast";
import type { UserProfile } from "@/types";

// The English (US) edition collects imperial units; the Hebrew edition is
// metric like the rest of the app. Storage stays metric internally (kg/cm) so
// the existing calorie calculator and every other page that reads
// user.profile need no changes — this page just converts at the edges.
export default function BookOnboardingPage() {
  const { user, firebaseUser } = useAuth();
  const { lang, dir, t } = useLanguage();
  const he = lang === "he";
  const imperial = usesImperial(true, lang);
  const router = useRouter();
  const [step, setStep] = useState<"profile" | "intro">("profile");
  const [saving, setSaving] = useState(false);

  const [gender, setGender] = useState<UserProfile["gender"]>("male");
  const [age, setAge] = useState("35");
  const [feet, setFeet] = useState("5");
  const [inches, setInches] = useState("8");
  const [heightCm, setHeightCm] = useState("175");
  const [weightLb, setWeightLb] = useState("190");
  const [targetWeightLb, setTargetWeightLb] = useState("170");
  const [weightKg, setWeightKg] = useState("86");
  const [targetWeightKg, setTargetWeightKg] = useState("77");
  const [activity, setActivity] = useState<UserProfile["activityLevel"]>("moderate");

  const habit1 = getHabitByOrder(1, lang)!;
  const firstName = user?.displayName?.split(" ")[0] ?? "";

  function handleProfileNext() {
    const w = parseFloat(imperial ? weightLb : weightKg);
    const tw = parseFloat(imperial ? targetWeightLb : targetWeightKg);
    const minW = imperial ? 60 : 30;
    const maxW = imperial ? 700 : 320;
    if (!age || +age < 10 || +age > 100) { toast.error(he ? "הזינו גיל תקין" : "Enter a valid age"); return; }
    if (!(imperial ? feet : heightCm) || !w || w < minW || w > maxW) { toast.error(he ? "הזינו גובה ומשקל תקינים" : "Enter a valid weight"); return; }
    if (tw >= w) { toast.error(he ? "משקל היעד צריך להיות נמוך מהמשקל הנוכחי" : "Target weight should be less than your current weight"); return; }
    setStep("intro");
  }

  async function handleStart() {
    if (!firebaseUser || !user) return;
    setSaving(true);
    try {
      // 1. Save the profile (metric internally, same calculator as everyone else).
      const profile: UserProfile = {
        gender,
        age: +age,
        heightCm: imperial ? Math.round(ftInToCm(+feet, +inches)) : Math.round(+heightCm),
        weightKg: imperial ? +lbToKg(+weightLb).toFixed(1) : +(+weightKg).toFixed(1),
        targetWeightKg: imperial ? +lbToKg(+targetWeightLb).toFixed(1) : +(+targetWeightKg).toFixed(1),
        activityLevel: activity,
        dailyCalorieTarget: 0,
      };
      profile.dailyCalorieTarget = calculateDailyTarget(profile);
      await updateUserProfile(firebaseUser.uid, profile);

      // 2. Silently create a private wing, same mechanism as the regular
      // onboarding's "Continue alone for now" — a book-mode reader starts
      // solo by default, and this keeps every wingId-keyed page working.
      if (!user.wingId) {
        const idToken = await firebaseUser.getIdToken();
        const res = await fetch("/api/wing/create", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({
            ownerName: user.displayName,
            name: he ? `המבנה של ${firstName}` : `${firstName}'s Circle`,
            isBookWing: true,
          }),
        });
        if (!res.ok) throw new Error("wing-create-failed");
      }

      // 3. Start habit 1.
      const token = await firebaseUser.getIdToken();
      const startRes = await fetch("/api/book/start-habit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ habitId: habit1.id }),
      });
      if (!startRes.ok) throw new Error("start-habit-failed");

      router.replace("/habits");
    } catch {
      toast.error(he ? "משהו השתבש, נסו שוב" : "Something went wrong, please try again");
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full bg-wing-surface border border-wing-border rounded-xl px-3 py-2.5 text-sm text-wing-ink";
  const labelCls = "text-xs font-mono uppercase tracking-wider text-wing-muted mb-1.5";
  const chip = (on: boolean) => `text-xs font-semibold px-3 py-1.5 rounded-full border ${on ? "bg-wing-ink text-wing-elevated border-wing-ink" : "bg-wing-surface text-wing-muted border-wing-border"}`;
  const sexBtn = (on: boolean) => `flex-1 py-2.5 rounded-xl text-sm font-bold border ${on ? "bg-wing-ink text-wing-elevated border-wing-ink" : "bg-wing-surface text-wing-muted border-wing-border"}`;
  const unitTag = "absolute left-2 top-1/2 -translate-y-1/2 text-xs text-wing-subtle";

  return (
    <div className="min-h-screen bg-wing-bg flex flex-col items-center justify-center p-5" dir={dir}>
      <div className="w-full max-w-[340px]">
        {step === "profile" ? (
          <div>
            <h1 className="text-2xl font-black text-wing-ink tracking-tight mb-2">
              {he ? "כמה מספרים קודם" : "A few numbers first"}
            </h1>
            <p className="text-sm text-wing-muted leading-relaxed mb-6">
              {he
                ? "זו נקודת המוצא שלכם - הספר מבקש למדוד אותה לפני שמתחילים."
                : "This sets your baseline — the book tells you to measure it before you start."}
            </p>

            <div className="flex flex-col gap-5">
              <div>
                <p className={labelCls}>{he ? "מין" : "Sex"}</p>
                <div className="flex gap-2">
                  <button onClick={() => setGender("male")} className={sexBtn(gender === "male")}>{he ? "גבר" : "Male"}</button>
                  <button onClick={() => setGender("female")} className={sexBtn(gender === "female")}>{he ? "אישה" : "Female"}</button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className={labelCls}>{he ? "גיל" : "Age"}</p>
                  <input type="number" value={age} onChange={(e) => setAge(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <p className={labelCls}>{he ? "גובה" : "Height"}</p>
                  {imperial ? (
                    <div className="flex gap-1.5">
                      <div className="flex-1 relative">
                        <input type="number" value={feet} onChange={(e) => setFeet(e.target.value)} className={inputCls} />
                        <span className={unitTag}>ft</span>
                      </div>
                      <div className="flex-1 relative">
                        <input type="number" value={inches} onChange={(e) => setInches(e.target.value)} className={inputCls} />
                        <span className={unitTag}>in</span>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <input type="number" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} className={inputCls} />
                      <span className={unitTag}>{he ? "ס״מ" : "cm"}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <p className={labelCls}>{imperial ? "Current weight (lb)" : he ? "משקל נוכחי (ק״ג)" : "Current weight (kg)"}</p>
                {imperial
                  ? <input type="number" value={weightLb} onChange={(e) => setWeightLb(e.target.value)} className={inputCls} />
                  : <input type="number" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} className={inputCls} />}
              </div>

              <div>
                <p className={labelCls}>{imperial ? "Target weight (lb)" : he ? "משקל יעד (ק״ג)" : "Target weight (kg)"}</p>
                {imperial
                  ? <input type="number" value={targetWeightLb} onChange={(e) => setTargetWeightLb(e.target.value)} className={inputCls} />
                  : <input type="number" value={targetWeightKg} onChange={(e) => setTargetWeightKg(e.target.value)} className={inputCls} />}
              </div>

              <div>
                <p className={labelCls}>{he ? "רמת פעילות" : "Activity level"}</p>
                <div className="flex flex-wrap gap-2">
                  {(["sedentary", "light", "moderate", "active", "very_active"] as const).map((a) => (
                    <button key={a} onClick={() => setActivity(a)} className={chip(activity === a)}>
                      {he ? (t(`activity_${a}`) as string) : a.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Button className="w-full mt-8" onClick={handleProfileNext}>{he ? "המשך" : "Continue"}</Button>
          </div>
        ) : (
          <div>
            <p className="text-xs font-bold text-wing-heat uppercase tracking-wider mb-2">
              {he ? "הרגל 1 מתוך 8" : "Habit 1 of 8"}
            </p>
            <h1 className="text-2xl font-black text-wing-ink tracking-tight mb-2">{habit1.name}</h1>
            <p className="text-sm text-wing-muted leading-relaxed mb-5">{habit1.tagline}</p>

            <div className="bg-wing-surface border border-wing-border rounded-[20px] p-5 space-y-3 mb-6">
              <p className="text-sm text-wing-ink"><span className="font-bold">{he ? "סימן מפעיל:" : "Cue:"}</span> {habit1.cue}</p>
              <p className="text-sm text-wing-ink"><span className="font-bold">{he ? "הפעולה:" : "Routine:"}</span> {habit1.routine}</p>
              <p className="text-sm text-wing-ink"><span className="font-bold">{he ? "התגמול:" : "Reward:"}</span> {habit1.reward}</p>
            </div>

            <div className="bg-wing-elevated border border-wing-border rounded-2xl px-4 py-3 mb-6">
              <p className={`text-sm text-wing-ink ${he ? "" : "font-mono"}`} dir={he ? "rtl" : "ltr"}>"{habit1.triggerSentence}"</p>
            </div>

            <Button className="w-full" onClick={handleStart} loading={saving}>
              {he ? "מתחילים בהרגל הראשון" : "Start habit one"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
