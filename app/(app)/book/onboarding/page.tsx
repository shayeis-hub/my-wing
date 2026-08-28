"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { updateUserProfile } from "@/lib/firebase/auth";
import { calculateDailyTarget } from "@/lib/utils/calculator";
import { getHabitByOrder } from "@/lib/book/habits";
import { Button } from "@/components/ui/Button";
import toast from "react-hot-toast";
import type { UserProfile } from "@/types";

// Phase-1 book-mode audience is the US (the book is English-only, sold on
// Amazon US) — imperial units here, unlike the regular onboarding's metric
// fields. Storage stays metric internally (kg/cm) so the existing calorie
// calculator and every other page that reads user.profile need no changes —
// this page just converts at the edges.
const LB_PER_KG = 2.2046226218;
const CM_PER_IN = 2.54;

function lbToKg(lb: number) {
  return lb / LB_PER_KG;
}
function ftInToCm(feet: number, inches: number) {
  return (feet * 12 + inches) * CM_PER_IN;
}

export default function BookOnboardingPage() {
  const { user, firebaseUser } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<"profile" | "intro">("profile");
  const [saving, setSaving] = useState(false);

  const [gender, setGender] = useState<UserProfile["gender"]>("male");
  const [age, setAge] = useState("35");
  const [feet, setFeet] = useState("5");
  const [inches, setInches] = useState("8");
  const [weightLb, setWeightLb] = useState("190");
  const [targetWeightLb, setTargetWeightLb] = useState("170");
  const [activity, setActivity] = useState<UserProfile["activityLevel"]>("moderate");

  const habit1 = getHabitByOrder(1)!;
  const firstName = user?.displayName?.split(" ")[0] ?? "";

  function handleProfileNext() {
    const w = parseFloat(weightLb);
    const tw = parseFloat(targetWeightLb);
    if (!age || +age < 10 || +age > 100) { toast.error("Enter a valid age"); return; }
    if (!feet || !w || w < 60 || w > 700) { toast.error("Enter a valid weight"); return; }
    if (tw >= w) { toast.error("Target weight should be less than your current weight"); return; }
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
        heightCm: Math.round(ftInToCm(+feet, +inches)),
        weightKg: +lbToKg(+weightLb).toFixed(1),
        targetWeightKg: +lbToKg(+targetWeightLb).toFixed(1),
        activityLevel: activity,
        dailyCalorieTarget: 0,
      };
      profile.dailyCalorieTarget = calculateDailyTarget(profile);
      await updateUserProfile(firebaseUser.uid, profile);

      // 2. Silently create a private wing, same mechanism as the regular
      // onboarding's "Continue alone for now" — a book-mode reader starts
      // solo by default, and this keeps every wingId-keyed page working.
      if (!user.wingId) {
        const res = await fetch("/api/wing/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ownerId: firebaseUser.uid,
            ownerName: user.displayName,
            name: `${firstName}'s Circle`,
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
      toast.error("Something went wrong, please try again");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-wing-bg flex flex-col items-center justify-center p-5">
      <div className="w-full max-w-[340px]">
        {step === "profile" ? (
          <div>
            <h1 className="text-2xl font-black text-wing-ink tracking-tight mb-2">
              A few numbers first
            </h1>
            <p className="text-sm text-wing-muted leading-relaxed mb-6">
              This sets your baseline — the book tells you to measure it before you start.
            </p>

            <div className="flex flex-col gap-5">
              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-wing-muted mb-1.5">Sex</p>
                <div className="flex gap-2">
                  <button onClick={() => setGender("male")} className={`flex-1 py-2.5 rounded-xl text-sm font-bold border ${gender === "male" ? "bg-wing-ink text-wing-elevated border-wing-ink" : "bg-wing-surface text-wing-muted border-wing-border"}`}>Male</button>
                  <button onClick={() => setGender("female")} className={`flex-1 py-2.5 rounded-xl text-sm font-bold border ${gender === "female" ? "bg-wing-ink text-wing-elevated border-wing-ink" : "bg-wing-surface text-wing-muted border-wing-border"}`}>Female</button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-mono uppercase tracking-wider text-wing-muted mb-1.5">Age</p>
                  <input type="number" value={age} onChange={(e) => setAge(e.target.value)} className="w-full bg-wing-surface border border-wing-border rounded-xl px-3 py-2.5 text-sm text-wing-ink" />
                </div>
                <div>
                  <p className="text-xs font-mono uppercase tracking-wider text-wing-muted mb-1.5">Height</p>
                  <div className="flex gap-1.5">
                    <div className="flex-1 relative">
                      <input type="number" value={feet} onChange={(e) => setFeet(e.target.value)} className="w-full bg-wing-surface border border-wing-border rounded-xl px-3 py-2.5 text-sm text-wing-ink" />
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-wing-subtle">ft</span>
                    </div>
                    <div className="flex-1 relative">
                      <input type="number" value={inches} onChange={(e) => setInches(e.target.value)} className="w-full bg-wing-surface border border-wing-border rounded-xl px-3 py-2.5 text-sm text-wing-ink" />
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-wing-subtle">in</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-wing-muted mb-1.5">Current weight (lb)</p>
                <input type="number" value={weightLb} onChange={(e) => setWeightLb(e.target.value)} className="w-full bg-wing-surface border border-wing-border rounded-xl px-3 py-2.5 text-sm text-wing-ink" />
              </div>

              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-wing-muted mb-1.5">Target weight (lb)</p>
                <input type="number" value={targetWeightLb} onChange={(e) => setTargetWeightLb(e.target.value)} className="w-full bg-wing-surface border border-wing-border rounded-xl px-3 py-2.5 text-sm text-wing-ink" />
              </div>

              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-wing-muted mb-1.5">Activity level</p>
                <div className="flex flex-wrap gap-2">
                  {(["sedentary", "light", "moderate", "active", "very_active"] as const).map((a) => (
                    <button key={a} onClick={() => setActivity(a)} className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${activity === a ? "bg-wing-ink text-wing-elevated border-wing-ink" : "bg-wing-surface text-wing-muted border-wing-border"}`}>
                      {a.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Button className="w-full mt-8" onClick={handleProfileNext}>Continue</Button>
          </div>
        ) : (
          <div>
            <p className="text-xs font-bold text-wing-heat uppercase tracking-wider mb-2">Habit 1 of 8</p>
            <h1 className="text-2xl font-black text-wing-ink tracking-tight mb-2">{habit1.name}</h1>
            <p className="text-sm text-wing-muted leading-relaxed mb-5">{habit1.tagline}</p>

            <div className="bg-wing-surface border border-wing-border rounded-[20px] p-5 space-y-3 mb-6">
              <p className="text-sm text-wing-ink"><span className="font-bold">Cue:</span> {habit1.cue}</p>
              <p className="text-sm text-wing-ink"><span className="font-bold">Routine:</span> {habit1.routine}</p>
              <p className="text-sm text-wing-ink"><span className="font-bold">Reward:</span> {habit1.reward}</p>
            </div>

            <div className="bg-wing-elevated border border-wing-border rounded-2xl px-4 py-3 mb-6">
              <p className="text-sm font-mono text-wing-ink" dir="ltr">"{habit1.triggerSentence}"</p>
            </div>

            <Button className="w-full" onClick={handleStart} loading={saving}>
              Start habit one
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
