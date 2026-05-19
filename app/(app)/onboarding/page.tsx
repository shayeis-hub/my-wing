"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { updateUserProfile } from "@/lib/firebase/auth";
import { calculateDailyTarget, calculateBMR } from "@/lib/utils/calculator";
import toast from "react-hot-toast";
import type { UserProfile } from "@/types";
import { UserPlus, Plus } from "lucide-react";

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
function Pill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
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

const activityLevels: { value: UserProfile["activityLevel"]; label: string }[] = [
  { value: "sedentary", label: "יושבני" },
  { value: "light",     label: "קל" },
  { value: "moderate",  label: "בינוני" },
  { value: "active",    label: "פעיל" },
  { value: "very_active", label: "מאוד פעיל" },
];

// ── Main component ──────────────────────────────────────────────────
export default function OnboardingPage() {
  const { user, firebaseUser } = useAuth();
  const router = useRouter();

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
  const [age, setAge] = useState("30");
  const [height, setHeight] = useState("170");
  const [weight, setWeight] = useState(80);
  const [targetWeight, setTargetWeight] = useState(70);
  const [activity, setActivity] = useState<UserProfile["activityLevel"]>("moderate");

  // ── Step 0: join or create wing ────────────────────────────────
  async function handleWingStep() {
    if (!firebaseUser || !user) return;
    if (user.wingId) { setStep(1); return; }

    if (joinOption === "code" && !joinCode.trim()) {
      toast.error("הכנס קוד הזמנה");
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
        const name = wingName.trim() || `המבנה של ${user.displayName.split(" ")[0]}`;
        const res = await fetch("/api/wing/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ownerId: firebaseUser.uid,
            ownerName: user.displayName,
            name,
          }),
        });
        if (!res.ok) throw new Error("create-failed");
      }
      setStep(1);
    } catch (e) {
      toast.error(
        e instanceof Error && e.message === "token-invalid"
          ? "קוד לא תקין. בדוק ונסה שוב."
          : "שגיאה, נסה שוב"
      );
    } finally {
      setWingLoading(false);
    }
  }

  // ── Step 1: validate profile ───────────────────────────────────
  function handleProfileStep() {
    if (!age || +age < 10 || +age > 100) { toast.error("גיל לא תקין"); return; }
    if (!height || +height < 100 || +height > 250) { toast.error("גובה לא תקין"); return; }
    if (targetWeight >= weight) { toast.error("משקל היעד חייב להיות נמוך מהמשקל הנוכחי"); return; }
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
        weightKg: weight,
        targetWeightKg: targetWeight,
        activityLevel: activity,
        dailyCalorieTarget: 0,
      };
      profile.dailyCalorieTarget = calculateDailyTarget(profile);
      await updateUserProfile(firebaseUser.uid, profile);
      toast.success("הפרופיל נשמר! ברוך הבא");
      router.replace("/dashboard");
    } catch {
      toast.error("שגיאה בשמירה, נסה שוב");
    } finally {
      setSaving(false);
    }
  }

  // ── Derived goals (for step 2) ─────────────────────────────────
  const profileForCalc: UserProfile = {
    gender,
    age: +age || 30,
    heightCm: +height || 170,
    weightKg: weight,
    targetWeightKg: targetWeight,
    activityLevel: activity,
    dailyCalorieTarget: 0,
  };
  const calories = calculateDailyTarget(profileForCalc);
  const bmr = Math.round(calculateBMR(profileForCalc));
  const activityBonus = calories - bmr + 500; // +500 because target already includes 500 deficit
  const proteinG = Math.round((calories * 0.25) / 4);
  const carbsG = Math.round((calories * 0.45) / 4);
  const fatG = Math.round((calories * 0.30) / 9);
  const weeksToGoal = weight > targetWeight ? Math.round((weight - targetWeight) / 0.5) : 0;

  const firstName = user?.displayName?.split(" ")[0] ?? "שלך";

  return (
    <div className="min-h-screen bg-wing-bg flex flex-col items-center justify-center p-5 pb-28">
      <div className="w-full max-w-[340px]">

        {/* ── Step 0: Join Wing ─────────────────────────────────── */}
        {step === 0 && (
          <div>
            <StepBar total={4} current={1} />
            <h1 className="text-[24px] font-black text-wing-ink tracking-[-0.025em] leading-tight mb-2">
              היי {firstName}!<br />בוא נמצא את המבנה שלך.
            </h1>
            <p className="text-sm text-wing-muted leading-relaxed mb-6">
              המבנה הוא קבוצה של עד 4 חברים. תומכים זה בזה, חולקים ארוחות, ועוברים את הדרך ביחד.
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
                    <p className="font-bold text-[15px] text-wing-ink">יש לי קוד הזמנה</p>
                    <p className="text-xs text-wing-muted mt-0.5">חבר/ה כבר שלח/ה לי</p>
                  </div>
                </div>
                {joinOption === "code" && (
                  <input
                    placeholder="הדבק קוד הזמנה"
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
                    <p className="font-bold text-[15px] text-wing-ink">יצירת מבנה חדש</p>
                    <p className="text-xs text-wing-muted mt-0.5">אזמין חברים בעצמי</p>
                  </div>
                  <span className="font-mono text-wing-ink text-sm">→</span>
                </div>
                {joinOption === "create" && (
                  <input
                    placeholder={`המבנה של ${firstName}`}
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
              {wingLoading ? "מחבר..." : "המשך"}
            </button>
          </div>
        )}

        {/* ── Step 1: Profile ───────────────────────────────────── */}
        {step === 1 && (
          <div>
            <StepBar total={4} current={2} />
            <h1 className="text-[24px] font-black text-wing-ink tracking-[-0.025em] leading-tight mb-2">
              קצת עליך
            </h1>
            <p className="text-sm text-wing-muted leading-relaxed mb-7">
              נשתמש בזה לחשב BMR, יעדי קלוריות, ולתת המלצות מותאמות.
            </p>

            <div className="flex flex-col gap-5">
              {/* Gender */}
              <div>
                <MonoLabel>מגדר</MonoLabel>
                <div className="flex gap-2">
                  <Pill label="זכר" active={gender === "male"} onClick={() => setGender("male")} />
                  <Pill label="נקבה" active={gender === "female"} onClick={() => setGender("female")} />
                </div>
              </div>

              {/* Age + Height row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <MonoLabel>גיל</MonoLabel>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-black text-[32px] text-wing-ink tracking-[-0.04em] tabular leading-none">
                      {age || "—"}
                    </span>
                    <span className="font-mono text-xs text-wing-muted">שנים</span>
                  </div>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    min={10} max={100}
                    inputMode="numeric"
                    className="mt-2 w-full bg-wing-bg border border-wing-border rounded-xl px-3 py-2 text-sm text-wing-ink focus:outline-none focus:ring-2 focus:ring-wing-ink"
                  />
                </div>
                <div>
                  <MonoLabel>גובה</MonoLabel>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-black text-[32px] text-wing-ink tracking-[-0.04em] tabular leading-none">
                      {height || "—"}
                    </span>
                    <span className="font-mono text-xs text-wing-muted">ס&quot;מ</span>
                  </div>
                  <input
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    min={100} max={250}
                    inputMode="numeric"
                    className="mt-2 w-full bg-wing-bg border border-wing-border rounded-xl px-3 py-2 text-sm text-wing-ink focus:outline-none focus:ring-2 focus:ring-wing-ink"
                  />
                </div>
              </div>

              {/* Current weight slider */}
              <div>
                <MonoLabel>משקל כעת</MonoLabel>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="font-black text-[48px] text-wing-ink tracking-[-0.05em] tabular leading-none">
                    {weight}
                  </span>
                  <span className="font-mono text-xs text-wing-muted">ק&quot;ג</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-wing-subtle">40</span>
                  <input
                    type="range"
                    min={40} max={150} step={0.5}
                    value={weight}
                    onChange={(e) => {
                      const w = parseFloat(e.target.value);
                      setWeight(w);
                      if (targetWeight >= w) setTargetWeight(Math.max(40, w - 5));
                    }}
                    className="wing-slider flex-1"
                  />
                  <span className="font-mono text-xs text-wing-subtle">150</span>
                </div>
              </div>

              {/* Target weight */}
              <div>
                <MonoLabel>משקל יעד</MonoLabel>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="font-black text-[32px] text-wing-heat tracking-[-0.04em] tabular leading-none">
                    {targetWeight}
                  </span>
                  <span className="font-mono text-xs text-wing-muted">ק&quot;ג</span>
                  {weight > targetWeight && (
                    <span className="font-mono text-xs text-wing-success font-bold mr-auto">
                      −{(weight - targetWeight).toFixed(1)} ק&quot;ג
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-wing-subtle">40</span>
                  <input
                    type="range"
                    min={40} max={Math.max(40, weight - 1)} step={0.5}
                    value={targetWeight}
                    onChange={(e) => setTargetWeight(parseFloat(e.target.value))}
                    className="wing-slider flex-1"
                  />
                  <span className="font-mono text-xs text-wing-subtle">{Math.max(40, weight - 1)}</span>
                </div>
              </div>

              {/* Activity */}
              <div>
                <MonoLabel>רמת פעילות</MonoLabel>
                <div className="flex flex-wrap gap-2">
                  {activityLevels.map((a) => (
                    <Pill
                      key={a.value}
                      label={a.label}
                      active={activity === a.value}
                      onClick={() => setActivity(a.value)}
                    />
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
                  חזרה
                </button>
              )}
              <button
                onClick={handleProfileStep}
                className="flex-1 bg-sunrise text-wing-ink font-extrabold text-sm py-3.5 rounded-[14px] active:scale-[0.97] transition-transform"
              >
                המשך
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Goals ─────────────────────────────────────── */}
        {step === 2 && (
          <div>
            <StepBar total={4} current={3} />
            <h1 className="text-[24px] font-black text-wing-ink tracking-[-0.025em] leading-tight mb-2">
              היעדים שלך
            </h1>
            <p className="text-sm text-wing-muted leading-relaxed mb-5">
              חישבנו לך הכל. תמיד אפשר לשנות בהמשך.
            </p>

            {/* Calorie hero card */}
            <div className="bg-sunrise rounded-[16px] p-5 mb-3">
              <MonoLabel>יעד קלוריות יומי</MonoLabel>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-black text-[52px] text-wing-ink tracking-[-0.05em] tabular leading-none">
                  {calories.toLocaleString()}
                </span>
                <span className="text-xs text-[#5a4220] font-mono">קק&quot;ל</span>
              </div>
              <p className="font-mono text-xs text-[#5a4220] mt-1.5">
                BMR · {bmr.toLocaleString()} + פעילות {Math.max(0, activityBonus).toLocaleString()}
              </p>
            </div>

            {/* Macros grid */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[
                { label: "חלבון", value: proteinG, color: "text-wing-heat" },
                { label: "פחמ׳",  value: carbsG,  color: "text-wing-honey" },
                { label: "שומן",  value: fatG,    color: "text-wing-success" },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-wing-surface border border-wing-border rounded-[12px] p-3 text-center">
                  <p className={`font-black text-lg tabular leading-none ${color}`}>
                    {value}<span className="text-[11px]">g</span>
                  </p>
                  <p className="font-mono text-[11px] text-wing-muted tracking-[0.1em] mt-1">{label}</p>
                </div>
              ))}
            </div>

            {/* Timeline */}
            {weeksToGoal > 0 && (
              <div className="bg-wing-surface border border-wing-border rounded-[12px] p-4 mb-6">
                <MonoLabel>צפי הגעה ליעד</MonoLabel>
                <div className="flex items-baseline gap-2">
                  <span className="font-black text-[22px] text-wing-ink tracking-[-0.03em] tabular">
                    {weeksToGoal > 52 ? `${Math.round(weeksToGoal / 4.3)} חודשים` : `${weeksToGoal} שבועות`}
                  </span>
                  <span className="font-mono text-xs text-wing-success font-bold">~0.5 ק&quot;ג / שבוע</span>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setStep(1)}
                className="flex-1 bg-wing-surface border border-wing-border text-wing-ink font-semibold text-sm py-3.5 rounded-[14px] active:scale-[0.97] transition-transform"
              >
                חזרה
              </button>
              <button
                onClick={handleFinish}
                disabled={saving}
                className="flex-[2] bg-sunrise text-wing-ink font-extrabold text-sm py-3.5 rounded-[14px] active:scale-[0.97] transition-transform disabled:opacity-60"
              >
                {saving ? "שומר..." : "בוא נתחיל"}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
