"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/lib/i18n";
import { updateUserProfile } from "@/lib/firebase/auth";
import { calculateDailyTarget, calculateBMR } from "@/lib/utils/calculator";
import toast from "react-hot-toast";
import type { UserProfile } from "@/types";
import Link from "next/link";
import { UserPlus, Plus, BookOpen } from "lucide-react";

// ── Step indicator ──────────────────────────────────────────────────
function StepBar({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex gap-1 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-[3px] flex-1 rounded-full transition-all duration-300 ${
            i === current ? "bg-sunrise" : "bg-wing-border"
          }`}
        />
      ))}
    </div>
  );
}

// ── Pill selector ───────────────────────────────────────────────────
function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-all ${
        active
          ? "bg-wing-ink text-wing-elevated border-wing-ink"
          : "bg-wing-surface text-wing-muted border-wing-border hover:border-wing-ink/30"
      }`}
    >
      {label}
    </button>
  );
}

// ── Mono label ──────────────────────────────────────────────────────
function MonoLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[11px] tracking-[0.22em] uppercase text-wing-muted mb-1.5">
      {children}
    </p>
  );
}

// ── Main component ──────────────────────────────────────────────────
export default function OnboardingPage() {
  const { user, firebaseUser } = useAuth();
  const { t, setGender: setI18nGender } = useLanguage();
  const router = useRouter();

  const activityLevels: { value: UserProfile["activityLevel"]; label: string }[] = [
    { value: "sedentary",   label: t("activity_sedentary") as string },
    { value: "light",       label: t("activity_light") as string },
    { value: "moderate",    label: t("activity_moderate") as string },
    { value: "active",      label: t("activity_active") as string },
    { value: "very_active", label: t("activity_very_active") as string },
  ];

  // Steps: 0 = join wing, 1 = profile, 2 = goals
  const [step, setStep] = useState(() => (user?.wingId ? 1 : 0));
  const [saving, setSaving] = useState(false);

  // Step 0 — wing
  const [joinOption, setJoinOption] = useState<"code" | "create">("code");
  const [joinCode, setJoinCode] = useState("");
  const [wingName, setWingName] = useState("");
  const [wingLoading, setWingLoading] = useState(false);

  // Step 1 — profile
  const [gender, setGender] = useState<UserProfile["gender"]>("male");
  // Reflect the selected gender immediately so onboarding copy (e.g. the finish
  // button) shows the right masculine/feminine form before the profile is saved.
  useEffect(() => { setI18nGender(gender); }, [gender, setI18nGender]);
  const [age, setAge] = useState("30");
  const [height, setHeight] = useState("170");
  const [weight, setWeight] = useState("80");
  const [targetWeight, setTargetWeight] = useState("70");
  const weightNum = parseFloat(weight) || 0;
  const targetWeightNum = parseFloat(targetWeight) || 0;
  const [activity, setActivity] = useState<UserProfile["activityLevel"]>("moderate");

  // ── Step 0: join or create wing ────────────────────────────────
  async function handleWingStep() {
    if (!firebaseUser || !user) return;
    if (user.wingId) { setStep(1); return; }

    if (joinOption === "code" && !joinCode.trim()) {
      toast.error(t("ob_wing_code_required") as string);
      return;
    }

    setWingLoading(true);
    try {
      if (joinOption === "code") {
        const res = await fetch("/api/wing/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: joinCode.trim(),
            userId: firebaseUser.uid,
            displayName: user.displayName,
            photoURL: user.photoURL ?? null,
          }),
        });
        if (!res.ok) throw new Error("token-invalid");
      } else {
        const firstName = user.displayName.split(" ")[0];
        const name = wingName.trim() || (t("ob_create_ph") as (n: string) => string)(firstName);
        const res = await fetch("/api/wing/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ownerId: firebaseUser.uid, ownerName: user.displayName, name }),
        });
        if (!res.ok) throw new Error("create-failed");
      }
      setStep(1);
    } catch (e) {
      toast.error(
        e instanceof Error && e.message === "token-invalid"
          ? t("ob_wing_token_invalid") as string
          : t("ob_wing_error") as string
      );
    } finally {
      setWingLoading(false);
    }
  }

  // Requiring a decision here (code vs. a named wing) at the very start of
  // signup is friction most new users don't want yet. This silently creates
  // the same kind of private wing as "create new" — just with a default name
  // and no input required — so every other page that reads user.wingId keeps
  // working unchanged. The user can invite people into it later from Settings.
  async function handleSkipWing() {
    if (!firebaseUser || !user) return;
    setWingLoading(true);
    try {
      const name = (t("ob_create_ph") as (n: string) => string)(firstName);
      const res = await fetch("/api/wing/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerId: firebaseUser.uid, ownerName: user.displayName, name }),
      });
      if (!res.ok) throw new Error();
      setStep(1);
    } catch {
      toast.error(t("ob_wing_error") as string);
    } finally {
      setWingLoading(false);
    }
  }

  // ── Step 1: validate profile ───────────────────────────────────
  function handleProfileStep() {
    if (!age || +age < 10 || +age > 100) { toast.error(t("ob_age_invalid") as string); return; }
    if (!height || +height < 100 || +height > 250) { toast.error(t("ob_height_invalid") as string); return; }
    if (!weight || weightNum < 30 || weightNum > 300) { toast.error(t("ob_weight_invalid") as string); return; }
    if (targetWeightNum >= weightNum) { toast.error(t("ob_weight_target_invalid") as string); return; }
    setStep(2);
  }

  // ── Step 2: save and finish ────────────────────────────────────
  async function handleFinish() {
    if (!firebaseUser) return;
    setSaving(true);
    try {
      const profile: UserProfile = {
        gender,
        age: +age,
        heightCm: +height,
        weightKg: weightNum,
        targetWeightKg: targetWeightNum,
        activityLevel: activity,
        dailyCalorieTarget: 0,
      };
      profile.dailyCalorieTarget = calculateDailyTarget(profile);
      await updateUserProfile(firebaseUser.uid, profile);
      toast.success(t("ob_saved") as string);
      router.replace("/dashboard");
    } catch {
      toast.error(t("ob_save_error") as string);
    } finally {
      setSaving(false);
    }
  }

  // ── Derived goals (for step 2) ─────────────────────────────────
  const profileForCalc: UserProfile = {
    gender, age: +age || 30, heightCm: +height || 170,
    weightKg: weightNum || 80, targetWeightKg: targetWeightNum || 70,
    activityLevel: activity, dailyCalorieTarget: 0,
  };
  const calories = calculateDailyTarget(profileForCalc);
  const bmr = Math.round(calculateBMR(profileForCalc));
  const activityBonus = calories - bmr + 500;
  const proteinG = Math.round((calories * 0.25) / 4);
  const carbsG = Math.round((calories * 0.45) / 4);
  const fatG = Math.round((calories * 0.30) / 9);
  const weeksToGoal = weightNum > targetWeightNum ? Math.round((weightNum - targetWeightNum) / 0.5) : 0;

  const firstName = user?.displayName?.split(" ")[0] ?? "";

  return (
    <div className="min-h-screen bg-wing-bg flex flex-col items-center justify-center p-5 pb-28">
      <div className="w-full max-w-[340px]">

        {/* ── Step 0: Join Wing ─────────────────────────────────── */}
        {step === 0 && (
          <div>
            <StepBar total={4} current={1} />

            {/* Deliberately placed above everything else, and visually
                distinct from the wing invite-code field below — a book
                buyer landing here can otherwise easily try their book code
                in the wing-code box by mistake, since both are just "enter
                a code" inputs. This is the earliest point in the whole
                flow that can reliably reach a fresh signup (there's no way
                to know someone's a book buyer before they self-identify). */}
            <Link
              href="/book/redeem"
              className="flex items-center gap-3 bg-wing-elevated border-2 border-dashed border-wing-heat rounded-2xl px-4 py-3.5 mb-6"
            >
              <div className="w-9 h-9 rounded-xl bg-wing-surface border border-wing-border flex items-center justify-center shrink-0">
                <BookOpen size={16} className="text-wing-heat" />
              </div>
              <div className="flex-1 text-right">
                <p className="font-bold text-sm text-wing-ink">Got a code from the book?</p>
                <p className="text-xs text-wing-muted mt-0.5">Enter it here — this is not the wing code below</p>
              </div>
            </Link>

            <h1 className="text-[24px] font-black text-wing-ink tracking-[-0.025em] leading-tight mb-2 whitespace-pre-line">
              {(t("ob_step0_title") as (n: string) => string)(firstName)}
            </h1>
            <p className="text-sm text-wing-muted leading-relaxed mb-6">
              {t("ob_step0_sub")}
            </p>

            <div className="flex flex-col gap-3 mb-6">
              {/* Option A — invite code */}
              <button
                onClick={() => setJoinOption("code")}
                className={`bg-wing-surface rounded-2xl p-4 text-right transition-all border-2 ${
                  joinOption === "code" ? "border-wing-ink" : "border-wing-border"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-wing-elevated border border-wing-border flex items-center justify-center flex-shrink-0">
                    <UserPlus size={16} className="text-wing-muted" />
                  </div>
                  <div className="flex-1 text-right">
                    <p className="font-bold text-[15px] text-wing-ink">{t("ob_join_title")}</p>
                    <p className="text-xs text-wing-muted mt-0.5">{t("ob_join_sub")}</p>
                  </div>
                </div>
                {joinOption === "code" && (
                  <input
                    placeholder={t("ob_join_ph") as string}
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    dir="ltr"
                    onClick={(e) => e.stopPropagation()}
                    className="w-full mt-3 bg-wing-bg border border-wing-border rounded-xl px-3 py-2.5 text-sm font-mono tracking-wide text-wing-ink placeholder:text-wing-subtle focus:outline-none focus:ring-2 focus:ring-wing-ink"
                  />
                )}
              </button>

              {/* Option B — create new */}
              <button
                onClick={() => setJoinOption("create")}
                className={`bg-wing-surface rounded-2xl p-4 text-right transition-all border-2 ${
                  joinOption === "create" ? "border-wing-ink" : "border-wing-border"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-sunrise flex items-center justify-center flex-shrink-0">
                    <Plus size={16} strokeWidth={2.5} className="text-wing-ink" />
                  </div>
                  <div className="flex-1 text-right">
                    <p className="font-bold text-[15px] text-wing-ink">{t("ob_create_title")}</p>
                    <p className="text-xs text-wing-muted mt-0.5">{t("ob_create_sub")}</p>
                  </div>
                  <span className="font-mono text-wing-ink text-sm">→</span>
                </div>
                {joinOption === "create" && (
                  <input
                    placeholder={(t("ob_create_ph") as (n: string) => string)(firstName)}
                    value={wingName}
                    onChange={(e) => setWingName(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full mt-3 bg-wing-bg border border-wing-border rounded-xl px-3 py-2.5 text-sm text-wing-ink placeholder:text-wing-subtle focus:outline-none focus:ring-2 focus:ring-wing-ink"
                  />
                )}
              </button>
            </div>

            <button
              onClick={handleWingStep}
              disabled={wingLoading}
              className="w-full bg-sunrise text-wing-ink font-extrabold text-sm py-3.5 rounded-[14px] active:scale-[0.97] transition-transform disabled:opacity-60"
            >
              {wingLoading ? t("ob_wing_connecting") : t("ob_wing_next")}
            </button>

            <button
              onClick={handleSkipWing}
              disabled={wingLoading}
              className="w-full mt-3 py-2.5 text-sm font-semibold text-wing-muted hover:text-wing-ink transition-colors disabled:opacity-60"
            >
              {t("ob_skip_wing")}
            </button>
            <p className="text-center text-xs text-wing-subtle -mt-2">{t("ob_skip_wing_note")}</p>
          </div>
        )}

        {/* ── Step 1: Profile ───────────────────────────────────── */}
        {step === 1 && (
          <div>
            <StepBar total={4} current={2} />
            <h1 className="text-[24px] font-black text-wing-ink tracking-[-0.025em] leading-tight mb-2">
              {t("ob_step1_title")}
            </h1>
            <p className="text-sm text-wing-muted leading-relaxed mb-7">
              {t("ob_step1_sub")}
            </p>

            <div className="flex flex-col gap-5">
              {/* Gender */}
              <div>
                <MonoLabel>{t("ob_gender_label")}</MonoLabel>
                <div className="flex gap-2">
                  <Pill label={t("ob_male") as string} active={gender === "male"} onClick={() => setGender("male")} />
                  <Pill label={t("ob_female") as string} active={gender === "female"} onClick={() => setGender("female")} />
                </div>
              </div>

              {/* Age + Height row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <MonoLabel>{t("ob_age_label")}</MonoLabel>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-black text-[32px] text-wing-ink tracking-[-0.04em] tabular leading-none">
                      {age || "—"}
                    </span>
                    <span className="font-mono text-xs text-wing-muted">{t("ob_age_unit")}</span>
                  </div>
                  <input
                    type="number" value={age} onChange={(e) => setAge(e.target.value)}
                    min={10} max={100} inputMode="numeric"
                    className="mt-2 w-full bg-wing-bg border border-wing-border rounded-xl px-3 py-2 text-sm text-wing-ink focus:outline-none focus:ring-2 focus:ring-wing-ink"
                  />
                </div>
                <div>
                  <MonoLabel>{t("ob_height_label")}</MonoLabel>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-black text-[32px] text-wing-ink tracking-[-0.04em] tabular leading-none">
                      {height || "—"}
                    </span>
                    <span className="font-mono text-xs text-wing-muted">{t("ob_height_unit")}</span>
                  </div>
                  <input
                    type="number" value={height} onChange={(e) => setHeight(e.target.value)}
                    min={100} max={250} inputMode="numeric"
                    className="mt-2 w-full bg-wing-bg border border-wing-border rounded-xl px-3 py-2 text-sm text-wing-ink focus:outline-none focus:ring-2 focus:ring-wing-ink"
                  />
                </div>
              </div>

              {/* Current weight */}
              <div>
                <MonoLabel>{t("ob_weight_label")}</MonoLabel>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="font-black text-[48px] text-wing-ink tracking-[-0.05em] tabular leading-none">{weight || "—"}</span>
                  <span className="font-mono text-xs text-wing-muted">{t("kg_label")}</span>
                </div>
                <input
                  type="number" value={weight}
                  onChange={(e) => {
                    setWeight(e.target.value);
                    const w = parseFloat(e.target.value);
                    if (!isNaN(w) && targetWeightNum >= w) setTargetWeight(String(Math.max(30, +(w - 5).toFixed(1))));
                  }}
                  min={30} max={300} step={0.1} inputMode="decimal"
                  className="w-full bg-wing-bg border border-wing-border rounded-xl px-3 py-2 text-sm text-wing-ink focus:outline-none focus:ring-2 focus:ring-wing-ink"
                />
              </div>

              {/* Target weight */}
              <div>
                <MonoLabel>{t("ob_target_label")}</MonoLabel>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="font-black text-[32px] text-wing-heat tracking-[-0.04em] tabular leading-none">{targetWeight || "—"}</span>
                  <span className="font-mono text-xs text-wing-muted">{t("kg_label")}</span>
                  {targetWeight && weightNum > targetWeightNum && (
                    <span className="font-mono text-xs text-wing-success font-bold mr-auto">
                      {(t("ob_weight_diff") as (d: number) => string)(+(weightNum - targetWeightNum).toFixed(1))}
                    </span>
                  )}
                </div>
                <input
                  type="number" value={targetWeight}
                  onChange={(e) => setTargetWeight(e.target.value)}
                  min={30} max={Math.max(30, +(weightNum - 0.1).toFixed(1))} step={0.1} inputMode="decimal"
                  className="w-full bg-wing-bg border border-wing-border rounded-xl px-3 py-2 text-sm text-wing-ink focus:outline-none focus:ring-2 focus:ring-wing-ink"
                />
              </div>

              {/* Activity */}
              <div>
                <MonoLabel>{t("ob_activity_label")}</MonoLabel>
                <div className="flex flex-wrap gap-2">
                  {activityLevels.map((a) => (
                    <Pill key={a.value} label={a.label} active={activity === a.value} onClick={() => setActivity(a.value)} />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-8">
              {!user?.wingId && (
                <button
                  onClick={() => setStep(0)}
                  className="flex-1 bg-wing-surface border border-wing-border text-wing-ink font-semibold text-sm py-3.5 rounded-[14px] active:scale-[0.97] transition-transform"
                >
                  {t("ob_back")}
                </button>
              )}
              <button
                onClick={handleProfileStep}
                className="flex-1 bg-sunrise text-wing-ink font-extrabold text-sm py-3.5 rounded-[14px] active:scale-[0.97] transition-transform"
              >
                {t("ob_next")}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Goals ─────────────────────────────────────── */}
        {step === 2 && (
          <div>
            <StepBar total={4} current={3} />
            <h1 className="text-[24px] font-black text-wing-ink tracking-[-0.025em] leading-tight mb-2">
              {t("ob_step2_title")}
            </h1>
            <p className="text-sm text-wing-muted leading-relaxed mb-5">
              {t("ob_step2_sub")}
            </p>

            {/* Calorie hero card */}
            <div className="bg-sunrise rounded-[16px] p-5 mb-3">
              <MonoLabel>{t("ob_calories_label")}</MonoLabel>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-black text-[52px] text-wing-ink tracking-[-0.05em] tabular leading-none">
                  {calories.toLocaleString()}
                </span>
                <span className="text-xs text-[#5a4220] font-mono">{t("kcal")}</span>
              </div>
              <p className="font-mono text-xs text-[#5a4220] mt-1.5">
                {(t("ob_bmr_line") as (bmr: number, act: number) => string)(bmr, Math.max(0, activityBonus))}
              </p>
            </div>

            {/* Macros grid */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[
                { key: "ob_protein", value: proteinG, color: "text-wing-heat" },
                { key: "ob_carbs",   value: carbsG,   color: "text-wing-honey" },
                { key: "ob_fat",     value: fatG,      color: "text-wing-success" },
              ].map(({ key, value, color }) => (
                <div key={key} className="bg-wing-surface border border-wing-border rounded-[12px] p-3 text-center">
                  <p className={`font-black text-lg tabular leading-none ${color}`}>
                    {value}<span className="text-[11px]">g</span>
                  </p>
                  <p className="font-mono text-[11px] text-wing-muted tracking-[0.1em] mt-1">{t(key as never)}</p>
                </div>
              ))}
            </div>

            {/* Timeline */}
            {weeksToGoal > 0 && (
              <div className="bg-wing-surface border border-wing-border rounded-[12px] p-4 mb-6">
                <MonoLabel>{t("ob_timeline_label")}</MonoLabel>
                <div className="flex items-baseline gap-2">
                  <span className="font-black text-[22px] text-wing-ink tracking-[-0.03em] tabular">
                    {weeksToGoal > 52
                      ? (t("ob_months") as (n: number) => string)(Math.round(weeksToGoal / 4.3))
                      : (t("ob_weeks") as (n: number) => string)(weeksToGoal)}
                  </span>
                  <span className="font-mono text-xs text-wing-success font-bold">{t("ob_rate")}</span>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setStep(1)}
                className="flex-1 bg-wing-surface border border-wing-border text-wing-ink font-semibold text-sm py-3.5 rounded-[14px] active:scale-[0.97] transition-transform"
              >
                {t("ob_back")}
              </button>
              <button
                onClick={handleFinish}
                disabled={saving}
                className="flex-[2] bg-sunrise text-wing-ink font-extrabold text-sm py-3.5 rounded-[14px] active:scale-[0.97] transition-transform disabled:opacity-60"
              >
                {saving ? t("ob_saving") : t("ob_finish")}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
