"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWing } from "@/hooks/useWing";
import { Card, CardTitle } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Button } from "@/components/ui/Button";
import { SOSButton } from "@/components/wing/SOSButton";
import { MealCard } from "@/components/meals/MealCard";
import { WeightChart } from "@/components/dashboard/WeightChart";
import { MemberDashboard } from "@/components/dashboard/MemberDashboard";
import { useMeals } from "@/hooks/useMeals";
import Link from "next/link";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { requestNotificationPermission } from "@/lib/firebase/messaging";
import { getTodayCheckin, getWeightHistory } from "@/lib/firebase/firestore";
import type { DailyCheckin, WeightLog } from "@/types";

function calcStepsCalories(steps: number, weightKg: number): number {
  return Math.round(steps * 0.0004 * weightKg);
}

function calcBMR(profile: { weightKg: number; heightCm: number; age: number; gender: "male" | "female" } | undefined): number {
  if (!profile) return 1800;
  const { weightKg, heightCm, age, gender } = profile;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(gender === "male" ? base + 5 : base - 161);
}

export default function DashboardPage() {
  const { user, firebaseUser } = useAuth();
  const [showNotifBanner, setShowNotifBanner] = useState(false);
  const [todayCheckin, setTodayCheckin] = useState<DailyCheckin | null>(null);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") setShowNotifBanner(true);
    }
  }, []);

  useEffect(() => {
    if (!user?.wingId || !firebaseUser) return;
    const today = format(new Date(), "yyyy-MM-dd");
    getTodayCheckin(user.wingId, firebaseUser.uid, today).then(setTodayCheckin);
    getWeightHistory(user.wingId, firebaseUser.uid).then(setWeightLogs);
  }, [user?.wingId, firebaseUser]);

  async function handleEnableNotifications() {
    if (!firebaseUser) return;
    await requestNotificationPermission(firebaseUser.uid);
    setShowNotifBanner(false);
  }

  const { wing } = useWing(user?.wingId);
  const { meals } = useMeals(user?.wingId);

  const today = format(new Date(), "EEEE, d MMMM", { locale: he });
  const todayDateStr = format(new Date(), "yyyy-MM-dd");

  const todayMeals = meals.filter((m) => {
    const d = m.createdAt?.toDate?.();
    return d && format(d, "yyyy-MM-dd") === todayDateStr;
  });
  const myTodayMeals = todayMeals.filter((m) => m.userId === firebaseUser?.uid);
  const todayCalories = myTodayMeals.reduce((sum, m) => sum + m.analysis.calories, 0);
  const weightKg = todayCheckin?.weightKg ?? user?.profile?.weightKg ?? 70;
  const bmr = calcBMR(user?.profile ? { ...user.profile, weightKg } : undefined);
  const stepsCalories = todayCheckin?.steps ? calcStepsCalories(todayCheckin.steps, weightKg) : 0;
  const workoutCalories = todayCheckin?.workout?.done ? (todayCheckin.workout.caloriesBurned ?? 0) : 0;
  const totalExpenditure = bmr + stepsCalories + workoutCalories;

  return (
    <div className="p-4 space-y-4">
      {/* Notification permission banner */}
      {showNotifBanner && (
        <div className="bg-wing-soft border border-wing-accent rounded-2xl p-3 flex items-center justify-between gap-3">
          <p className="text-sm text-wing-primary font-medium">🔔 אפשר התראות כדי לקבל SOS מהחברים</p>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => setShowNotifBanner(false)} className="text-xs text-slate-400 px-2 py-1">לא עכשיו</button>
            <button onClick={handleEnableNotifications} className="text-xs bg-wing-primary text-white px-3 py-1 rounded-xl font-medium">אפשר</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="pt-4">
        <p className="text-slate-500 text-sm">{today}</p>
        <h1 className="text-2xl font-bold text-slate-800">
          שלום, {user?.displayName?.split(" ")[0] ?? "חבר"} 👋
        </h1>
        {wing && (
          <p className="text-wing-primary text-sm font-medium mt-0.5">
            מבנה: {wing.name} · {wing.memberIds.length} חברים
          </p>
        )}
      </div>

      {/* Member selector */}
      {wing && wing.members.length > 1 && firebaseUser && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          <button
            onClick={() => setSelectedMemberId(null)}
            className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
              selectedMemberId === null
                ? "bg-wing-primary text-white"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            שלי
          </button>
          {wing.members
            .filter((m) => m.uid !== firebaseUser.uid)
            .map((m) => (
              <button
                key={m.uid}
                onClick={() => setSelectedMemberId(m.uid)}
                className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                  selectedMemberId === m.uid
                    ? "bg-wing-primary text-white"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {m.displayName.split(" ")[0]}
              </button>
            ))}
        </div>
      )}

      {/* Member view */}
      {selectedMemberId && wing && firebaseUser && user && (
        <MemberDashboard
          memberId={selectedMemberId}
          memberName={wing.members.find((m) => m.uid === selectedMemberId)?.displayName ?? ""}
          wingId={wing.id}
          currentUserId={firebaseUser.uid}
          currentUserName={user.displayName}
          todayMeals={todayMeals}
        />
      )}

      {/* Personal dashboard — hidden when viewing another member */}
      {!selectedMemberId && (
        <>
          {/* Calorie progress */}
          <Card>
            <CardTitle className="mb-3">קלוריות היום</CardTitle>
            <div className="flex items-end justify-between mb-2">
              <div>
                <span className="text-3xl font-bold text-slate-800">{todayCalories}</span>
                <span className="text-slate-400 text-sm mr-1">/ {bmr} קק&quot;ל BMR</span>
              </div>
              <span className="text-sm text-slate-500">{myTodayMeals.length} ארוחות</span>
            </div>
            <ProgressBar
              value={todayCalories}
              max={bmr}
              color={todayCalories > bmr ? "bg-red-400" : "bg-wing-primary"}
            />
            {/* Expenditure breakdown */}
            <div className="mt-3 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">🔥 BMR (מנוחה)</span>
                <span className="font-medium text-slate-700">{bmr} קק&quot;ל</span>
              </div>
              {stepsCalories > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">👟 צעדים ({todayCheckin?.steps?.toLocaleString()})</span>
                  <span className="font-medium text-green-600">+{stepsCalories} קק&quot;ל</span>
                </div>
              )}
              {workoutCalories > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">🏋️ אימון</span>
                  <span className="font-medium text-green-600">+{workoutCalories} קק&quot;ל</span>
                </div>
              )}
              {(stepsCalories > 0 || workoutCalories > 0) && (
                <div className="flex justify-between text-sm pt-1 border-t border-slate-100">
                  <span className="font-semibold text-slate-600">סה&quot;כ הוצאה</span>
                  <span className="font-bold text-slate-800">{totalExpenditure} קק&quot;ל</span>
                </div>
              )}
            </div>
          </Card>

          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-3">
            <Link href="/meals">
              <Card className="text-center py-5 cursor-pointer hover:shadow-card-hover transition-shadow">
                <div className="text-3xl mb-1">🍽️</div>
                <p className="text-sm font-semibold text-slate-700">צילום ארוחה</p>
                <p className="text-xs text-slate-400">ניתוח AI מיידי</p>
              </Card>
            </Link>
            <Link href="/checkin">
              <Card className="text-center py-5 cursor-pointer hover:shadow-card-hover transition-shadow">
                <div className="text-3xl mb-1">✅</div>
                <p className="text-sm font-semibold text-slate-700">צ&apos;ק-אין יומי</p>
                <p className="text-xs text-slate-400">מים, אימון, משקל</p>
              </Card>
            </Link>
            <Link href="/steps">
              <Card className="text-center py-5 cursor-pointer hover:shadow-card-hover transition-shadow">
                <div className="text-3xl mb-1">👟</div>
                <p className="text-sm font-semibold text-slate-700">צעדים</p>
                <p className="text-xs text-slate-400">לוח תוצאות</p>
              </Card>
            </Link>
            <Link href="/calculator">
              <Card className="text-center py-5 cursor-pointer hover:shadow-card-hover transition-shadow">
                <div className="text-3xl mb-1">🧮</div>
                <p className="text-sm font-semibold text-slate-700">מחשבון</p>
                <p className="text-xs text-slate-400">TDEE / BMR</p>
              </Card>
            </Link>
          </div>

          {/* SOS */}
          {user && firebaseUser && (
            <SOSButton
              wingId={user.wingId ?? ""}
              userId={firebaseUser.uid}
              userName={user.displayName}
            />
          )}

          {/* Recent meals */}
          {myTodayMeals.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-slate-700">ארוחות היום</h2>
                <Link href="/meals" className="text-sm text-wing-primary">הכל</Link>
              </div>
              {myTodayMeals.slice(0, 3).map((meal) => (
                <MealCard key={meal.id} meal={meal} currentUserId={firebaseUser?.uid} currentUserName={user?.displayName} />
              ))}
            </div>
          )}

          {/* Weight progress chart */}
          {(weightLogs.length > 0 || todayCheckin?.weightKg) && (
            <Card>
              <CardTitle className="mb-3">⚖️ מגמת משקל</CardTitle>
              <WeightChart logs={weightLogs} targetWeight={user?.profile?.targetWeightKg} />
            </Card>
          )}
        </>
      )}

      {/* No wing state */}
      {!user?.wingId && (
        <Card className="text-center py-8 space-y-3">
          <div className="text-4xl">🪽</div>
          <p className="font-semibold text-slate-700">עדיין לא במבנה כנף</p>
          <p className="text-sm text-slate-500">צור מבנה חדש או הצטרף לאחד קיים</p>
          <Link href="/wing">
            <Button className="mt-2">הצטרף / צור מבנה</Button>
          </Link>
        </Card>
      )}
    </div>
  );
}
