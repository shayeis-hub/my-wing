"use client";

import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/lib/i18n";
import { useWing } from "@/hooks/useWing";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SOSButton } from "@/components/wing/SOSButton";
import { MealCard } from "@/components/meals/MealCard";
import { WeightChart } from "@/components/dashboard/WeightChart";
import { MemberDashboard } from "@/components/dashboard/MemberDashboard";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { Leaderboard } from "@/components/steps/Leaderboard";
import { useMeals } from "@/hooks/useMeals";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { enUS } from "date-fns/locale";
import { requestNotificationPermission } from "@/lib/firebase/messaging";
import { isNativeApp, readTodayStepsFromHealth } from "@/lib/fitness/healthConnect";
import { pushWidgetData } from "@/lib/widget/native";
import { registerNativePush } from "@/lib/push/native";
import { useRouter } from "next/navigation";
import { subscribeTodayCheckin, getWeightHistory, saveCheckin, getGroupEnergy, saveSteps, type GroupEnergy } from "@/lib/firebase/firestore";
import { calculateBMR } from "@/lib/utils/calculator";
import type { DailyCheckin, WeightLog } from "@/types";
import { Bell, Footprints, Scale, ChevronLeft, Droplets, Flame, Plus, Minus, Leaf, Check, Pencil, Users, UtensilsCrossed, MessageCircle, Trophy } from "lucide-react";
import { getWingSteps, getUserCheckinDates } from "@/lib/firebase/firestore";
import { calcStreak } from "@/lib/utils/streak";
import type { StepsEntry } from "@/types";
import { AdBanner } from "@/components/ads/AdBanner";
import { isWingAdmin } from "@/lib/wing/roles";


export default function DashboardPage() {
  const { user, firebaseUser } = useAuth();
  const { t, lang, gender } = useLanguage();
  const router = useRouter();
  const [showNotifBanner, setShowNotifBanner] = useState(false);
  const [todayCheckin, setTodayCheckin] = useState<DailyCheckin | null>(null);
  const [groupEnergy, setGroupEnergy] = useState<GroupEnergy | null>(null);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [wingSteps, setWingSteps] = useState<StepsEntry[]>([]);
  const [streak, setStreak] = useState(0);
  const [pulseField, setPulseField] = useState<"water" | "veg" | "steps" | null>(null);
  const [editingSteps, setEditingSteps] = useState(false);
  const [stepsInput, setStepsInput] = useState("");
  const healthSyncedRef = useRef(false);
  // On native, the Health Connect prompt must wait until the push-permission
  // dialog is dismissed (Android shows one permission dialog at a time).
  const [pushSettled, setPushSettled] = useState(!isNativeApp());

  useEffect(() => {
    if (isNativeApp()) return; // native app handles its own permission prompt
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") setShowNotifBanner(true);
    }
  }, []);

  // Native app: register for FCM push + route taps to the right page.
  // Only after the push dialog is dismissed do we allow the Health prompt.
  useEffect(() => {
    if (!firebaseUser || !isNativeApp()) return;
    registerNativePush(firebaseUser.uid, (path) => router.push(path)).finally(() =>
      setPushSettled(true)
    );
  }, [firebaseUser, router]);

  useEffect(() => {
    if (!user?.wingId || !firebaseUser) return;
    const today = format(new Date(), "yyyy-MM-dd");
    // Real-time listener so widget/checkin-page updates reflect immediately
    const unsub = subscribeTodayCheckin(user.wingId, firebaseUser.uid, today, setTodayCheckin);
    getWeightHistory(user.wingId, firebaseUser.uid).then(setWeightLogs);
    getWingSteps(user.wingId, today).then(setWingSteps);
    getUserCheckinDates(user.wingId, firebaseUser.uid).then((dates) => setStreak(calcStreak(dates)));
    getGroupEnergy(user.wingId, wing?.memberIds.length ?? 1).then(setGroupEnergy);
    return unsub;
  }, [user?.wingId, firebaseUser]);

  // Native app: sync Health steps once push has settled and today's steps loaded.
  // Guarded by healthSyncedRef so it runs at most once per dashboard load.
  useEffect(() => {
    if (!pushSettled) return;
    maybeSyncHealthSteps(wingSteps);
  }, [pushSettled, wingSteps]);

  // Native app: auto-sync today's steps from Health Connect into the dashboard.
  // No dedicated steps page needed — runs once per load, only updates upward.
  async function maybeSyncHealthSteps(entries: StepsEntry[]) {
    if (!isNativeApp() || !user?.wingId || !firebaseUser || healthSyncedRef.current) return;
    healthSyncedRef.current = true;
    try {
      const r = await readTodayStepsFromHealth();
if (!r.authorized || !r.steps || r.steps <= 0) return;
      const syncedSteps = r.steps;
      const today = format(new Date(), "yyyy-MM-dd");
      const current = entries.find((s) => s.userId === firebaseUser.uid)?.steps ?? 0;
      if (syncedSteps <= current) return; // don't lower a manually-entered value
      await saveSteps(user.wingId, {
        wingId: user.wingId,
        userId: firebaseUser.uid,
        userName: user.displayName,
        date: today,
        steps: syncedSteps,
      });
      setWingSteps((prev) => [
        ...prev.filter((s) => s.userId !== firebaseUser.uid),
        {
          id: `${firebaseUser.uid}_${today}`,
          wingId: user.wingId!,
          userId: firebaseUser.uid,
          userName: user.displayName,
          date: today,
          steps: syncedSteps,
          createdAt: null as unknown as StepsEntry["createdAt"],
        },
      ]);
    } catch {
      /* health sync failed — non-critical */
    }
  }

  async function handleEnableNotifications() {
    if (!firebaseUser) return;
    await requestNotificationPermission(firebaseUser.uid);
    setShowNotifBanner(false);
  }

  // Quick update — saves a partial change to today's checkin and updates UI
  async function quickUpdate(updates: Partial<DailyCheckin>, pulseKey?: "water" | "veg" | "steps") {
    if (!user?.wingId || !firebaseUser) return;
    const today = format(new Date(), "yyyy-MM-dd");
    const merged = {
      wingId: user.wingId,
      userId: firebaseUser.uid,
      userName: user.displayName,
      date: today,
      waterGlasses: todayCheckin?.waterGlasses ?? 0,
      vegetablesServings: todayCheckin?.vegetablesServings ?? 0,
      mood: todayCheckin?.mood ?? 3,
      workout: todayCheckin?.workout ?? { done: false },
      ...(todayCheckin?.steps ? { steps: todayCheckin.steps } : {}),
      ...(todayCheckin?.weightKg ? { weightKg: todayCheckin.weightKg } : {}),
      ...(todayCheckin?.notes ? { notes: todayCheckin.notes } : {}),
      ...(todayCheckin?.eatingWindow ? { eatingWindow: todayCheckin.eatingWindow } : {}),
      ...updates,
    };
    // Optimistic UI update
    setTodayCheckin({ ...merged, id: `${firebaseUser.uid}_${today}`, createdAt: todayCheckin?.createdAt ?? (null as unknown as DailyCheckin["createdAt"]) });
    // Also sync wingSteps optimistically so the dashboard shows the new value immediately
    // (displaySteps prefers wingSteps over todayCheckin.steps)
    if (updates.steps !== undefined) {
      const myUid = firebaseUser.uid;
      setWingSteps((prev) => {
        const others = prev.filter((s) => s.userId !== myUid);
        return [
          ...others,
          {
            id: `${myUid}_${today}`,
            wingId: user.wingId!,
            userId: myUid,
            userName: user.displayName,
            date: today,
            steps: updates.steps!,
            createdAt: null as unknown as StepsEntry["createdAt"],
          },
        ];
      });
    }
    if (pulseKey) {
      setPulseField(pulseKey);
      setTimeout(() => setPulseField(null), 400);
    }
    try {
      await saveCheckin(user.wingId, merged);
    } catch {
      // Revert on error
      setTodayCheckin(todayCheckin);
    }
  }

  function quickAddWater() {
    const current = todayCheckin?.waterGlasses ?? 0;
    const next = Math.min(4, Math.round((current + 0.1) * 10) / 10);
    quickUpdate({ waterGlasses: next }, "water");
  }

  function quickRemoveWater() {
    const current = todayCheckin?.waterGlasses ?? 0;
    const next = Math.max(0, Math.round((current - 0.1) * 10) / 10);
    quickUpdate({ waterGlasses: next }, "water");
  }

  function quickAddVeg() {
    const current = todayCheckin?.vegetablesServings ?? 0;
    const next = Math.min(6, current + 1);
    quickUpdate({ vegetablesServings: next }, "veg");
  }

  function quickRemoveVeg() {
    const current = todayCheckin?.vegetablesServings ?? 0;
    const next = Math.max(0, current - 1);
    quickUpdate({ vegetablesServings: next }, "veg");
  }

  function startEditingSteps() {
    setStepsInput(displaySteps != null ? String(displaySteps) : "");
    setEditingSteps(true);
  }

  async function saveStepsInline() {
    const n = parseInt(stepsInput);
    if (isNaN(n) || n < 0) { setEditingSteps(false); return; }
    await quickUpdate({ steps: n }, "steps");
    setEditingSteps(false);
  }

  const { wing } = useWing(user?.wingId);
  const { meals } = useMeals(user?.wingId);

  const today = format(new Date(), "EEEE, d MMMM", { locale: lang === "he" ? he : enUS });
  const todayDateStr = format(new Date(), "yyyy-MM-dd");

  const todayMeals = meals.filter((m) => {
    const dateKey = m.mealDate ?? (() => {
      const d = m.createdAt?.toDate?.();
      return d ? format(d, "yyyy-MM-dd") : null;
    })();
    return dateKey === todayDateStr;
  });
  const myTodayMeals = todayMeals.filter((m) => m.userId === firebaseUser?.uid);
  const todayCalories = myTodayMeals.reduce((sum, m) => sum + m.analysis.calories, 0);
  const weightKg = todayCheckin?.weightKg ?? user?.profile?.weightKg ?? 70;
  const bmr = user?.profile ? Math.round(calculateBMR({ ...user.profile, weightKg })) : 1800;

  const otherMembers = (wing?.members ?? []).filter((m) => m.uid !== firebaseUser?.uid);
  const hasCheckedInToday = !!todayCheckin;
  const hasMealToday = myTodayMeals.length > 0;
  const ctaHref = !hasCheckedInToday ? "/checkin" : !hasMealToday ? "/meals" : "/feed";
  const ctaLabel = lang === "he"
    ? (!hasCheckedInToday ? "צ׳ק-אפ יומי" : !hasMealToday ? "רישום ארוחה" : (gender === "female" ? "שתפי עם הכנף" : "שתף עם הכנף"))
    : (!hasCheckedInToday ? "Daily Check-up" : !hasMealToday ? "Log Meal" : "Share with Wing");

  // Steps: prefer Google Fit sync, fall back to check-in
  const myStepsEntry = wingSteps.find((s) => s.userId === firebaseUser?.uid);
  const displaySteps = myStepsEntry?.steps ?? todayCheckin?.steps ?? null;

  // Keep the home-screen widget's steps/water in sync with the dashboard.
  useEffect(() => {
    if (!isNativeApp()) return;
    void pushWidgetData(displaySteps ?? 0, todayCheckin?.waterGlasses ?? 0);
  }, [displaySteps, todayCheckin?.waterGlasses]);

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
          <div className="flex items-center gap-2 mt-0.5">
            <h1 className="text-[28px] font-black text-wing-ink tracking-[-0.025em]">
              {t("dashboard_hello")}, {user?.displayName?.split(" ")[0] ?? t("dashboard_hello_default")}
            </h1>
            {streak > 0 && (
              <span className="inline-flex items-center gap-0.5 text-sm font-bold text-wing-heat bg-wing-elevated border border-wing-border rounded-full px-2 py-0.5">
                <Flame size={12} /> {streak}
              </span>
            )}
          </div>
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

      {/* CTA — primary action */}
      {user?.wingId && (
        <Link href={ctaHref}>
          <button
            className="w-full py-3.5 rounded-[16px] font-bold text-base text-[#7a4f00] transition-all active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, #fff3b8, #ffc89a)" }}
          >
            {ctaLabel}
          </button>
        </Link>
      )}

      {/* Group Energy */}
      {user?.wingId && groupEnergy && (
        <div className="bg-wing-surface border border-wing-border rounded-[20px] px-4 py-3">
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <div className="flex justify-center mb-1">
                <Users size={16} className="text-wing-muted" />
              </div>
              <p className="font-black text-wing-ink text-lg leading-none">{groupEnergy.checkinsToday}</p>
              <p className="text-[10px] text-wing-muted mt-0.5">{lang === "he" ? "צ׳ק-אפ היום" : "checked in"}</p>
            </div>
            <div>
              <div className="flex justify-center mb-1">
                <UtensilsCrossed size={16} className="text-wing-muted" />
              </div>
              <p className="font-black text-wing-ink text-lg leading-none">{groupEnergy.mealsTodayCount}</p>
              <p className="text-[10px] text-wing-muted mt-0.5">{lang === "he" ? "ארוחות היום" : "meals today"}</p>
            </div>
            <div>
              <div className="flex justify-center mb-1">
                <Trophy size={16} className="text-wing-muted" />
              </div>
              <p className="font-black text-wing-ink text-lg leading-none">{groupEnergy.streakDays}</p>
              <p className="text-[10px] text-wing-muted mt-0.5">{lang === "he" ? "ימי רצף" : "day streak"}</p>
            </div>
            <div>
              <div className="flex justify-center mb-1">
                <MessageCircle size={16} className="text-wing-muted" />
              </div>
              <p className="font-black text-wing-ink text-lg leading-none">{groupEnergy.newActivity}</p>
              <p className="text-[10px] text-wing-muted mt-0.5">{lang === "he" ? "פעילות חדשה" : "new activity"}</p>
            </div>
          </div>
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
          isViewerAdmin={isWingAdmin(wing, firebaseUser.uid)}
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
            <div className="flex items-end gap-2 mb-3 flex-wrap">
              <span
                className="font-black tabular text-wing-ink"
                style={{ fontSize: 52, letterSpacing: "-0.05em", fontFeatureSettings: '"tnum"', lineHeight: 1 }}
              >
                {todayCalories}
              </span>
              <span className="text-sm text-wing-ink/60 mb-2">
                / {bmr} {t("kcal")} {lang === "he" ? "צרכת / יעד" : "consumed / goal"}
              </span>
            </div>
            <ProgressBar
              value={todayCalories}
              max={bmr}
              height="sm"
              color={todayCalories > bmr ? "bg-red-500" : "bg-[#1a1814]"}
            />

            {/* Quick Log mini stats: Water / Veggies / Steps */}
            <div className="mt-3 grid grid-cols-3 gap-2">
              {/* Water */}
              <div className={`bg-white/80 rounded-2xl px-2 pt-2 pb-1.5 transition-all ${pulseField === "water" ? "ring-2 ring-[#c79a00]" : ""}`}>
                <p className="font-mono text-[11px] tracking-[0.12em] uppercase text-wing-ink/70 flex items-center justify-center gap-1 font-bold">
                  <Droplets size={10} strokeWidth={2.5} /> {t("water_label")}
                </p>
                <div className="flex items-center justify-between mt-1">
                  <button
                    onClick={quickRemoveWater}
                    disabled={(todayCheckin?.waterGlasses ?? 0) <= 0}
                    className="w-6 h-6 rounded-full bg-wing-ink/15 flex items-center justify-center active:scale-90 transition-transform disabled:opacity-30"
                    aria-label="minus"
                  >
                    <Minus size={12} className="text-wing-ink" strokeWidth={3} />
                  </button>
                  <span className="font-black text-wing-ink tabular text-sm" style={{ letterSpacing: "-0.04em" }}>
                    {todayCheckin?.waterGlasses ? `${todayCheckin.waterGlasses.toFixed(2).replace(/\.?0+$/, "")}L` : "0L"}
                  </span>
                  <button
                    onClick={quickAddWater}
                    disabled={(todayCheckin?.waterGlasses ?? 0) >= 4}
                    className="w-6 h-6 rounded-full bg-wing-ink flex items-center justify-center active:scale-90 transition-transform disabled:opacity-30"
                    aria-label="plus"
                  >
                    <Plus size={12} className="text-wing-elevated" strokeWidth={3} />
                  </button>
                </div>
              </div>

              {/* Vegetables */}
              <div className={`bg-white/80 rounded-2xl px-2 pt-2 pb-1.5 transition-all ${pulseField === "veg" ? "ring-2 ring-green-600" : ""}`}>
                <p className="font-mono text-[11px] tracking-[0.12em] uppercase text-wing-ink/70 flex items-center justify-center gap-1 font-bold">
                  <Leaf size={10} strokeWidth={2.5} /> {t("dashboard_mini_veggies")}
                </p>
                <div className="flex items-center justify-between mt-1">
                  <button
                    onClick={quickRemoveVeg}
                    disabled={(todayCheckin?.vegetablesServings ?? 0) <= 0}
                    className="w-6 h-6 rounded-full bg-wing-ink/15 flex items-center justify-center active:scale-90 transition-transform disabled:opacity-30"
                    aria-label="minus"
                  >
                    <Minus size={12} className="text-wing-ink" strokeWidth={3} />
                  </button>
                  <span className="font-black text-wing-ink tabular text-sm" style={{ letterSpacing: "-0.04em" }}>
                    {todayCheckin?.vegetablesServings ?? 0}
                  </span>
                  <button
                    onClick={quickAddVeg}
                    disabled={(todayCheckin?.vegetablesServings ?? 0) >= 6}
                    className="w-6 h-6 rounded-full bg-wing-ink flex items-center justify-center active:scale-90 transition-transform disabled:opacity-30"
                    aria-label="plus"
                  >
                    <Plus size={12} className="text-wing-elevated" strokeWidth={3} />
                  </button>
                </div>
              </div>

              {/* Steps */}
              {editingSteps ? (
                <div className="bg-white rounded-2xl px-2 pt-2 pb-1.5">
                  <p className="font-mono text-[11px] tracking-[0.12em] uppercase text-wing-ink/70 flex items-center justify-center gap-1 font-bold">
                    <Footprints size={10} strokeWidth={2.5} /> {t("steps_label")}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <input
                      type="number"
                      inputMode="numeric"
                      value={stepsInput}
                      onChange={(e) => setStepsInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") saveStepsInline(); if (e.key === "Escape") setEditingSteps(false); }}
                      autoFocus
                      className="flex-1 min-w-0 text-center font-black text-wing-ink text-sm bg-transparent border-b border-wing-border focus:outline-none focus:border-wing-ink tabular"
                    />
                    <button onClick={saveStepsInline} className="shrink-0 w-6 h-6 rounded-full bg-wing-ink flex items-center justify-center active:scale-90 transition-transform">
                      <Check size={12} className="text-wing-elevated" strokeWidth={3} />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={startEditingSteps}
                  className={`bg-white/80 rounded-2xl px-2 pt-2 pb-1.5 active:scale-95 transition-all ${pulseField === "steps" ? "ring-2 ring-wing-heat" : ""}`}
                >
                  <p className="font-mono text-[11px] tracking-[0.12em] uppercase text-wing-ink/70 flex items-center justify-center gap-1 font-bold">
                    <Footprints size={10} strokeWidth={2.5} /> {t("steps_label")}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="w-6 h-6" aria-hidden />
                    <span className="font-black text-wing-ink tabular text-sm" style={{ letterSpacing: "-0.04em" }}>
                      {displaySteps != null
                        ? displaySteps >= 1000
                          ? `${(displaySteps / 1000).toFixed(1)}k`
                          : displaySteps
                        : "—"}
                    </span>
                    <span className="w-6 h-6 rounded-full bg-wing-ink/15 flex items-center justify-center">
                      <Pencil size={11} className="text-wing-ink" strokeWidth={2.5} />
                    </span>
                  </div>
                </button>
              )}
            </div>
          </div>


          {/* Wing Leaderboard (steps) */}
          {wing && firebaseUser && wingSteps.length > 0 && (
            <Leaderboard entries={wingSteps} currentUserId={firebaseUser.uid} members={wing.members} />
          )}

          {/* Recent encouragements / comments received this week */}
          {user?.wingId && firebaseUser && (
            <RecentActivity wingId={user.wingId} userId={firebaseUser.uid} userName={user.displayName} />
          )}

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

          {/* SOS */}
          {user && firebaseUser && (
            <SOSButton wingId={user.wingId ?? ""} userId={firebaseUser.uid} userName={user.displayName} />
          )}

          {/* Ad Banner */}
          <AdBanner slot="1364961245" layoutKey="-6t+ed+2i-1n-4w" format="fluid" className="rounded-2xl" />

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
                <MealCard key={meal.id} meal={meal} currentUserId={firebaseUser?.uid} currentUserName={user?.displayName} isViewerAdmin={isWingAdmin(wing, firebaseUser?.uid)} />
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
              <div className="flex justify-center">
                <svg width="48" height="29" viewBox="0 0 60 36" fill="none"><defs><linearGradient id="wl-dash" x1="0" y1="0" x2="60" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#f5dd4b"/><stop offset="1" stopColor="#ff6b47"/></linearGradient></defs><path d="M4 30 L30 8 L56 30" stroke="url(#wl-dash)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="30" cy="8" r="3" fill="#d4541a"/><circle cx="17" cy="19" r="1.8" fill="#1a1814"/><circle cx="43" cy="19" r="1.8" fill="#1a1814"/></svg>
              </div>
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
          {t("menu_signout")}
        </button>
      </div>
    </div>
  );
}

