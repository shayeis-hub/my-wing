"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWing } from "@/hooks/useWing";
import { Card, CardTitle } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Button } from "@/components/ui/Button";
import { SOSButton } from "@/components/wing/SOSButton";
import { MealCard } from "@/components/meals/MealCard";
import { useMeals } from "@/hooks/useMeals";
import Link from "next/link";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { requestNotificationPermission } from "@/lib/firebase/messaging";

export default function DashboardPage() {
  const { user, firebaseUser } = useAuth();
  const [showNotifBanner, setShowNotifBanner] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") setShowNotifBanner(true);
    }
  }, []);

  async function handleEnableNotifications() {
    if (!firebaseUser) return;
    const token = await requestNotificationPermission(firebaseUser.uid);
    setShowNotifBanner(false);
    if (token) {
      // toast handled silently — permission granted
    }
  }
  const { wing } = useWing(user?.wingId);
  const { meals } = useMeals(user?.wingId);

  const today = format(new Date(), "EEEE, d MMMM", { locale: he });
  const todayMeals = meals.filter((m) => {
    const d = m.createdAt?.toDate?.();
    return d && format(d, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
  });
  const todayCalories = todayMeals.reduce((sum, m) => sum + m.analysis.calories, 0);
  const dailyTarget = user?.profile?.dailyCalorieTarget ?? 2000;

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

      {/* Calorie progress */}
      <Card>
        <CardTitle className="mb-3">קלוריות היום</CardTitle>
        <div className="flex items-end justify-between mb-2">
          <div>
            <span className="text-3xl font-bold text-slate-800">{todayCalories}</span>
            <span className="text-slate-400 text-sm mr-1">/ {dailyTarget} קק&quot;ל</span>
          </div>
          <span className="text-sm text-slate-500">{todayMeals.length} ארוחות</span>
        </div>
        <ProgressBar
          value={todayCalories}
          max={dailyTarget}
          color={todayCalories > dailyTarget ? "bg-red-400" : "bg-wing-primary"}
        />
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
            <p className="text-xs text-slate-400">מים וירקות</p>
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
      {todayMeals.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-700">ארוחות היום</h2>
            <Link href="/meals" className="text-sm text-wing-primary">הכל</Link>
          </div>
          {todayMeals.slice(0, 3).map((meal) => (
            <MealCard key={meal.id} meal={meal} />
          ))}
        </div>
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
