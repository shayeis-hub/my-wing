"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/lib/i18n";
import { useWing } from "@/hooks/useWing";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SOSButton } from "@/components/wing/SOSButton";
import { MealCard } from "@/components/meals/MealCard";
import { WeightChart } from "@/components/dashboard/WeightChart";
import { MemberDashboard } from "@/components/dashboard/MemberDashboard";
import { useMeals } from "@/hooks/useMeals";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { enUS } from "date-fns/locale";
import { requestNotificationPermission } from "@/lib/firebase/messaging";
import { getTodayCheckin, getWeightHistory } from "@/lib/firebase/firestore";
import { calculateBMR } from "@/lib/utils/calculator";
import type { DailyCheckin, WeightLog } from "@/types";
import { Bell, Footprints, Scale, CheckSquare, ChevronLeft, Droplets, Flame } from "lucide-react";
import { getWingSteps, getUserCheckinDates } from "@/lib/firebase/firestore";
import { calcStreak } from "@/lib/utils/streak";
import type { StepsEntry } from "@/types";


export default function DashboardPage() {
  const { user, firebaseUser } = useAuth();
  const { t, lang } = useLanguage();
  const [showNotifBanner, setShowNotifBanner] = useState(false);
  const [todayCheckin, setTodayCheckin] = useState<DailyCheckin | null>(null);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [wingSteps, setWingSteps] = useState<StepsEntry[]>([]);
  const [streak, setStreak] = useState(0);

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
    getWingSteps(user.wingId, today).then(setWingSteps);
    getUserCheckinDates(user.wingId, firebaseUser.uid).then((dates) => setStreak(calcStreak(dates)));
  }, [user?.wingId, firebaseUser]);

  async function handleEnableNotifications() {
    if (!firebaseUser) return;
    await requestNotificationPermission(firebaseUser.uid);
    setShowNotifBanner(false);
  }

  const { wing } = useWing(user?.wingId);
  const { meals } = useMeals(user?.wingId);

  const today = format(new Date(), "EEEE, d MMMM", { locale: lang === "he" ? he : enUS });
  const todayDateStr = format(new Date(), "yyyy-MM-dd");

  const todayMeals = meals.filter((m) => {
    const d = m.createdAt?.toDate?.();
    return d && format(d, "yyyy-MM-dd") === todayDateStr;
  });
  const myTodayMeals = todayMeals.filter((m) => m.userId === firebaseUser?.uid);
  const todayCalories = myTodayMeals.reduce((sum, m) => sum + m.analysis.calories, 0);
  const weightKg = todayCheckin?.weightKg ?? user?.profile?.weightKg ?? 70;
  const bmr = user?.profile ? Math.round(calculateBMR({ ...user.profile, weightKg })) : 1800;

  const otherMembers = (wing?.members ?? []).filter((m) => m.uid !== firebaseUser?.uid);

  return (
    <div className="p-4 space-y-4">
      {/* Notification banner */}
      {showNotifBanner && (
        <div className="bg-wing-surface border border-wing-border rounded-2xl p-3 flex items-center justify-between gap-3">
          <p className="text-sm text-wing-heat font-medium flex items-center gap-1.5">
            <Bell size={14} /> {t("dashboard_notif_text")}
          </p>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => setShowNotifBanner(false)} className="text-xs text-wing-muted px-2 py-1">{t("dashboard_notif_no")}</button>
            <button onClick={handleEnableNotifications} className="text-xs bg-wing-ink text-wing-elevated px-3 py-1 rounded-xl font-bold">{t("dashboard_notif_yes")}</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="pt-4 flex items-start justify-between">
        <div>
          <p className="font-mono text-xs tracking-[0.2em] uppercase text-wing-muted">{today}</p>
          <h1 className="text-[28px] font-black text-wing-ink tracking-[-0.025em] mt-0.5">
            {t("dashboard_hello")}, {user?.displayName?.split(" ")[0] ?? t("dashboard_hello_default")}
          </h1>
          {wing && (
            <p className="text-sm text-wing-muted mt-0.5">
              {(t("dashboard_wing_name") as (name: string, total: number, active: number) => string)(wing.name, wing.memberIds.length, wingSteps.length)}
            </p>
          )}
        </div>
        <Link href="/profile" className="mt-1">
          <Avatar
            name={user?.displayName ?? ""}
            photoURL={user?.photoURL}
            size={44}
            isCurrentUser
            className="border-2 border-white shadow-sm"
          />
        </Link>
      </div>

      {/* Member selector strip */}
      {wing && otherMembers.length > 0 && firebaseUser && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          <button
            onClick={() => setSelectedMemberId(null)}
            className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-bold transition-all ${
              selectedMemberId === null
                ? "bg-wing-ink text-wing-elevated"
                : "bg-wing-elevated border border-wing-border text-wing-muted"
            }`}
          >
            {t("my")}
          </button>
          {otherMembers.map((m) => (
            <button
              key={m.uid}
              onClick={() => setSelectedMemberId(m.uid)}
              className={`flex-shrink-0 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                selectedMemberId === m.uid
                  ? "bg-wing-ink text-wing-elevated"
                  : "bg-wing-elevated border border-wing-border text-wing-muted"
              }`}
            >
              <Avatar name={m.displayName} photoURL={m.photoURL} size={18} />
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

      {/* Personal dashboard */}
      {!selectedMemberId && (
        <>
          {/* Hero calorie card */}
          <div
            className="rounded-[20px] p-5"
            style={{ background: "linear-gradient(135deg, #fff3b8, #ffc89a)" }}
          >
            <div className="flex items-start justify-between mb-1">
              <span className="font-mono text-[11px] tracking-[0.22em] uppercase text-[#c79a00]">{t("dashboard_calories_today")}</span>
              <span className="text-xs text-wing-ink/60">{(t("dashboard_meals_count") as (n: number) => string)(myTodayMeals.length)}</span>
            </div>
            <div className="flex items-end gap-3 mb-3">
              <span
                className="font-black tabular text-wing-ink"
                style={{ fontSize: 52, letterSpacing: "-0.05em", fontFeatureSettings: '"tnum"', lineHeight: 1 }}
              >
                {todayCalories}
              </span>
              <span className="text-sm text-wing-ink/60 mb-2">/ {bmr} {t("kcal")}</span>
            </div>
            <ProgressBar
              value={todayCalories}
              max={bmr}
              height="sm"
              color={todayCalories > bmr ? "bg-red-500" : "bg-[#1a1814]"}
            />

            {/* Mini stats: צעדים / מים / סטריק */}
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="bg-white/50 rounded-2xl px-3 py-2 text-center">
                <p className="text-[11px] font-mono text-[#c79a00] uppercase tracking-wider flex items-center justify-center gap-0.5">
                  <Footprints size={9} /> {t("steps_label")}
                </p>
                <p className="font-black text-wing-ink text-base tabular" style={{ letterSpacing: "-0.03em" }}>
                  {todayCheckin?.steps
                    ? todayCheckin.steps >= 1000
                      ? `${(todayCheckin.steps / 1000).toFixed(1)}k`
                      : todayCheckin.steps
                    : "—"}
                </p>
              </div>
              <div className="bg-white/50 rounded-2xl px-3 py-2 text-center">
                <p className="text-[11px] font-mono text-[#c79a00] uppercase tracking-wider flex items-center justify-center gap-0.5">
                  <Droplets size={9} /> {t("water_label")}
                </p>
                <p className="font-black text-wing-ink text-base tabular" style={{ letterSpacing: "-0.03em" }}>
                  {todayCheckin?.waterGlasses ? `${todayCheckin.waterGlasses.toFixed(1)}L` : "—"}
                </p>
              </div>
              <div className="bg-white/50 rounded-2xl px-3 py-2 text-center">
                <p className="text-[11px] font-mono text-[#c79a00] uppercase tracking-wider flex items-center justify-center gap-0.5">
                  <Flame size={9} /> {t("dashboard_mini_streak")}
                </p>
                <p className="font-black text-base tabular" style={{ letterSpacing: "-0.03em", color: streak > 0 ? "#d4541a" : "#1a1814" }}>
                  {streak > 0 ? streak : "—"}
                </p>
              </div>
            </div>
          </div>


          {/* Secondary 2-col grid */}
          <div className="grid grid-cols-2 gap-3">
            <Link href="/checkin">
              <div className="bg-wing-surface border border-wing-border rounded-[20px] p-4 text-center hover:border-wing-ink transition-colors">
                <CheckSquare size={24} className="mx-auto mb-2 text-wing-heat" />
                <p className="text-sm font-bold text-wing-ink">{t("nav_checkin")}</p>
                <p className="text-xs text-wing-muted mt-0.5">{t("dashboard_checkin_sub")}</p>
              </div>
            </Link>
            <Link href="/steps">
              <div className="bg-wing-surface border border-wing-border rounded-[20px] p-4 text-center hover:border-wing-ink transition-colors">
                <Footprints size={24} className="mx-auto mb-2 text-wing-heat" />
                <p className="text-sm font-bold text-wing-ink">{t("steps_label")}</p>
                <p className="text-xs text-wing-muted mt-0.5">{t("dashboard_steps_sub")}</p>
              </div>
            </Link>
          </div>

          {/* SOS */}
          {user && firebaseUser && (
            <SOSButton wingId={user.wingId ?? ""} userId={firebaseUser.uid} userName={user.displayName} />
          )}

          {/* Recent meals */}
          {myTodayMeals.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-wing-ink">{t("dashboard_meals_today")}</h2>
                <Link href="/meals" className="text-sm text-wing-heat font-medium flex items-center gap-0.5">
                  {t("all")} <ChevronLeft size={14} />
                </Link>
              </div>
              {myTodayMeals.slice(0, 3).map((meal) => (
                <MealCard key={meal.id} meal={meal} currentUserId={firebaseUser?.uid} currentUserName={user?.displayName} />
              ))}
            </div>
          )}

          {/* Weight chart */}
          {(weightLogs.length > 0 || todayCheckin?.weightKg) && (
            <div className="bg-wing-surface border border-wing-border rounded-[20px] p-5">
              <div className="flex items-center gap-1.5 mb-3">
                <Scale size={15} className="text-wing-muted" />
                <span className="font-bold text-wing-ink text-sm">{t("dashboard_weight_progress")}</span>
              </div>
              <WeightChart logs={weightLogs} targetWeight={user?.profile?.targetWeightKg} />
            </div>
          )}

          {/* No wing state */}
          {!user?.wingId && (
            <div className="bg-wing-surface border border-wing-border rounded-[20px] p-8 text-center space-y-3">
              <div className="text-4xl">🪽</div>
              <p className="font-bold text-wing-ink">{t("dashboard_no_wing")}</p>
              <p className="text-sm text-wing-muted">{t("dashboard_no_wing_sub")}</p>
              <Link href="/wing">
                <button
                  className="mt-2 px-6 py-2.5 rounded-[14px] font-bold text-sm text-wing-ink transition-all active:scale-[0.97]"
                  style={{ background: "linear-gradient(135deg, #f5dd4b, #ff6b47)" }}
                >
                  {t("dashboard_join_wing")}
                </button>
              </Link>
            </div>
          )}
        </>
      )}

      {/* Sign out */}
      <div className="text-center pb-4">
        <button
          onClick={async () => {
            const { signOut } = await import("firebase/auth");
            const { auth } = await import("@/lib/firebase/config");
            await signOut(auth);
          }}
          className="text-xs font-mono text-wing-subtle hover:text-wing-muted transition-colors tracking-widest uppercase"
        >
          התנתק
        </button>
      </div>
    </div>
  );
}

