"use client";

import { useEffect, useState, useCallback } from "react";
import { Heart } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useWing } from "@/hooks/useWing";
import { useLanguage } from "@/lib/i18n";
import { Leaderboard } from "@/components/steps/Leaderboard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { saveSteps, getWingSteps, getTodayCheckin } from "@/lib/firebase/firestore";
import { connectGoogleFit, fetchStepsFromServer } from "@/lib/fitness/googleFit";
import { isNativeApp, readTodayStepsFromHealth, openHealthSettings } from "@/lib/fitness/healthConnect";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { useSearchParams } from "next/navigation";
import type { StepsEntry } from "@/types";
import { Suspense } from "react";

const DEFAULT_GOAL = 10000;
const CIRCUMFERENCE = 578; // 2π * r(92)

function StepsRing({ steps, goal, t }: { steps: number; goal: number; t: (k: string) => unknown }) {
  const pct = Math.min(1, steps / goal);
  const dashOffset = CIRCUMFERENCE * (1 - pct);

  return (
    <div className="flex flex-col items-center py-4">
      <div className="relative">
        <svg width="220" height="220" viewBox="0 0 220 220">
          <defs>
            <linearGradient id="steps-ring-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f5dd4b" />
              <stop offset="100%" stopColor="#ff6b47" />
            </linearGradient>
          </defs>
          <circle cx="110" cy="110" r="92" stroke="#ede5d0" strokeWidth="16" fill="none" />
          <circle
            cx="110" cy="110" r="92"
            stroke="url(#steps-ring-grad)"
            strokeWidth="16"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 110 110)"
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-black tabular text-wing-ink"
            style={{ fontSize: 40, letterSpacing: "-0.05em", fontFeatureSettings: '"tnum"', lineHeight: 1 }}
          >
            {steps >= 1000 ? `${(steps / 1000).toFixed(1)}k` : steps.toLocaleString()}
          </span>
          <span className="font-mono text-xs tracking-[0.22em] uppercase text-wing-muted mt-1">
            {t("steps_ring_label") as string}
          </span>
          <span className="text-xs text-wing-subtle mt-1">
            {(t("steps_goal_pct") as (pct: number) => string)(Math.round(pct * 100))}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 w-full mt-2">
        <div className="bg-wing-surface border border-wing-border rounded-2xl p-3 text-center">
          <p className="font-black text-wing-ink text-lg tabular" style={{ letterSpacing: "-0.03em" }}>
            {Math.round(steps * 0.0008 * 10) / 10}
          </p>
          <p className="font-mono text-[11px] tracking-[0.18em] uppercase text-wing-muted">{t("steps_km") as string}</p>
        </div>
        <div className="bg-wing-surface border border-wing-border rounded-2xl p-3 text-center">
          <p className="font-black text-wing-ink text-lg tabular" style={{ letterSpacing: "-0.03em" }}>
            {Math.round(steps * 0.04)}
          </p>
          <p className="font-mono text-[11px] tracking-[0.18em] uppercase text-wing-muted">{t("kcal") as string}</p>
        </div>
        <div className="bg-wing-surface border border-wing-border rounded-2xl p-3 text-center">
          <p className="font-black text-wing-ink text-lg tabular" style={{ letterSpacing: "-0.03em" }}>
            {goal.toLocaleString()}
          </p>
          <p className="font-mono text-[11px] tracking-[0.18em] uppercase text-wing-muted">{t("steps_goal_label") as string}</p>
        </div>
      </div>
    </div>
  );
}

function StepsPageInner() {
  const { user, firebaseUser } = useAuth();
  const { wing } = useWing(user?.wingId);
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const [entries, setEntries] = useState<StepsEntry[]>([]);
  const [manualSteps, setManualSteps] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [fitConnected, setFitConnected] = useState<boolean | null>(null);
  const [native, setNative] = useState(false);
  const [healthUnavailable, setHealthUnavailable] = useState(false);
  const today = format(new Date(), "yyyy-MM-dd");
  const [selectedDate, setSelectedDate] = useState(today);
  const isRetro = selectedDate !== today;

  // Detect native app shell after mount (avoids SSR hydration mismatch)
  useEffect(() => { setNative(isNativeApp()); }, []);

  useEffect(() => {
    if (searchParams.get("fitConnected") === "1") {
      toast.success(t("steps_fit_success") as string);
      window.history.replaceState({}, "", "/steps");
    }
    if (searchParams.get("fitError")) {
      toast.error(t("steps_fit_err") as string);
      window.history.replaceState({}, "", "/steps");
    }
  }, [searchParams]);

  useEffect(() => {
    if (!user?.wingId || !firebaseUser) return;
    setEntries([]);
    Promise.all([
      getWingSteps(user.wingId, selectedDate),
      getTodayCheckin(user.wingId, firebaseUser.uid, selectedDate),
    ]).then(([stepsEntries, checkin]) => {
      const hasMyEntry = stepsEntries.some((e) => e.userId === firebaseUser.uid);
      if (!hasMyEntry && checkin?.steps) {
        setEntries([
          ...stepsEntries,
          {
            id: `${firebaseUser.uid}_${selectedDate}`,
            wingId: user.wingId!,
            userId: firebaseUser.uid,
            userName: user.displayName,
            date: selectedDate,
            steps: checkin.steps,
            createdAt: null as unknown as import("firebase/firestore").Timestamp,
          },
        ]);
      } else {
        setEntries(stepsEntries);
      }
    });
  }, [user?.wingId, firebaseUser, selectedDate]);

  const saveAndUpdateEntries = useCallback(async (steps: number, dateToSave = today) => {
    if (!user?.wingId || !firebaseUser) return;
    await saveSteps(user.wingId, {
      wingId: user.wingId,
      userId: firebaseUser.uid,
      userName: user.displayName,
      date: dateToSave,
      steps,
    });
    setEntries((prev) => [
      ...prev.filter((e) => e.userId !== firebaseUser.uid),
      {
        id: `${firebaseUser.uid}_${dateToSave}`,
        wingId: user.wingId!,
        userId: firebaseUser.uid,
        userName: user.displayName,
        date: dateToSave,
        steps,
        createdAt: null as unknown as StepsEntry["createdAt"],
      },
    ]);
    setEditing(false);
  }, [user, firebaseUser, today]);

  useEffect(() => {
    if (!firebaseUser || isRetro) return; // only auto-sync for today
    setSyncing(true);
    const run = native
      ? readTodayStepsFromHealth().then(async (r) => {
          setHealthUnavailable(r.reason === "unavailable");
          setFitConnected(r.authorized);
          if (r.authorized && r.steps && r.steps > 0) {
            await saveAndUpdateEntries(r.steps, today);
          }
        })
      : fetchStepsFromServer(firebaseUser.uid).then(async ({ connected, steps }) => {
          setFitConnected(connected);
          if (connected && steps && steps > 0) {
            await saveAndUpdateEntries(steps, today);
          }
        });
    run.catch(() => setFitConnected(false)).finally(() => setSyncing(false));
  }, [firebaseUser, isRetro, native]);

  async function handleManualSync() {
    if (!firebaseUser) return;
    setSyncing(true);
    try {
      if (native) {
        const r = await readTodayStepsFromHealth();
        setHealthUnavailable(r.reason === "unavailable");
        setFitConnected(r.authorized);
        if (r.authorized && r.steps && r.steps > 0) {
          await saveAndUpdateEntries(r.steps);
          toast.success((t("steps_synced_toast") as (n: number) => string)(r.steps));
        }
      } else {
        const { connected, steps } = await fetchStepsFromServer(firebaseUser.uid);
        setFitConnected(connected);
        if (connected && steps && steps > 0) {
          await saveAndUpdateEntries(steps);
          toast.success((t("steps_synced_toast") as (n: number) => string)(steps));
        }
      }
    } finally {
      setSyncing(false);
    }
  }

  async function handleSave() {
    if (!user?.wingId || !firebaseUser || !manualSteps) return;
    const steps = parseInt(manualSteps);
    if (isNaN(steps) || steps < 0) { toast.error(t("steps_invalid") as string); return; }
    setSaving(true);
    try {
      await saveAndUpdateEntries(steps, selectedDate);
      toast.success((t("steps_saved_toast") as (n: number) => string)(steps));
      setManualSteps("");
    } catch {
      toast.error(t("steps_save_err") as string);
    } finally {
      setSaving(false);
    }
  }

  const myEntry = entries.find((e) => e.userId === firebaseUser?.uid);

  return (
    <div className="p-4 space-y-4">
      <div className="pt-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-wing-ink tracking-tight">{t("steps_ring_label") as string}</h1>
          <p className="font-mono text-xs tracking-[0.2em] uppercase text-wing-muted mt-0.5">
            {format(new Date(selectedDate + "T12:00:00"), "d MMMM yyyy")}
          </p>
        </div>
        <input
          type="date"
          value={selectedDate}
          max={today}
          onChange={(e) => {
            setSelectedDate(e.target.value);
            setEditing(false);
            setManualSteps("");
          }}
          className="bg-wing-elevated border border-wing-border rounded-2xl px-3 py-2 text-sm text-wing-ink focus:outline-none focus:ring-2 focus:ring-wing-ink"
        />
      </div>

      {/* Health source status bar — always visible when not retro.
          Native app → Health Connect / HealthKit. Browser/PWA → Google Fit. */}
      {!isRetro && firebaseUser && (
        <div className="bg-wing-surface border border-wing-border rounded-[20px] px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {native ? (
              <Heart size={18} className="text-red-500" />
            ) : (
              <img src="https://www.gstatic.com/images/branding/product/1x/gsa_android_48dp.png" alt="" className="w-5 h-5" />
            )}
            <span className="text-sm font-medium text-wing-ink">
              {native ? (t("steps_health_label") as string) : "Google Fit"}
            </span>
            {syncing && <span className="text-xs text-wing-muted animate-pulse">{t("steps_syncing_short") as string}</span>}
            {!syncing && native && healthUnavailable && <span className="text-xs text-wing-muted">{t("steps_health_unavailable") as string}</span>}
            {!syncing && !healthUnavailable && fitConnected === true && <span className="text-xs text-green-600 font-medium">✓ {t("steps_connected") as string}</span>}
            {!syncing && !healthUnavailable && fitConnected === false && <span className="text-xs text-wing-muted">{t("steps_not_connected") as string}</span>}
          </div>

          {/* Refresh when connected */}
          {fitConnected === true && !syncing && !healthUnavailable && (
            <button onClick={handleManualSync} className="text-xs text-wing-heat font-semibold underline">
              {t("steps_refresh") as string}
            </button>
          )}

          {/* Native: install Health Connect when unavailable */}
          {native && healthUnavailable && !syncing && (
            <button
              onClick={openHealthSettings}
              className="text-xs bg-wing-ink text-wing-elevated font-bold px-3 py-1.5 rounded-xl"
            >
              {t("steps_health_install") as string}
            </button>
          )}

          {/* Connect / grant access when not connected */}
          {fitConnected === false && !healthUnavailable && (
            <button
              onClick={() => (native ? handleManualSync() : connectGoogleFit(firebaseUser.uid))}
              className="text-xs bg-wing-ink text-wing-elevated font-bold px-3 py-1.5 rounded-xl"
            >
              {t("steps_connect_fit") as string}
            </button>
          )}
        </div>
      )}

      <div className="bg-wing-surface border border-wing-border rounded-[20px] p-4">
        {syncing && !myEntry ? (
          <div className="text-center py-12 text-wing-muted text-sm animate-pulse">
            {t("steps_syncing") as string}
          </div>
        ) : myEntry && !editing ? (
          <>
            <StepsRing steps={myEntry.steps} goal={user?.profile?.stepsGoal ?? DEFAULT_GOAL} t={t as (k: string) => unknown} />
            <div className="flex justify-center gap-4 pb-2">
              <button
                onClick={() => { setManualSteps(String(myEntry.steps)); setEditing(true); }}
                className="text-sm text-wing-muted underline"
              >
                {t("steps_update_manual") as string}
              </button>
            </div>
          </>
        ) : !syncing && (
          <div className="space-y-3 py-2">
            <p className="text-sm font-semibold text-wing-ink text-center mb-4">{t("steps_enter_prompt") as string}</p>
            <Input
              type="number"
              value={manualSteps}
              onChange={(e) => setManualSteps(e.target.value)}
              placeholder={t("steps_input_ph") as string}
              dir="ltr"
            />
            <div className="flex gap-2">
              {editing && (
                <Button variant="secondary" onClick={() => setEditing(false)} className="flex-1">{t("cancel") as string}</Button>
              )}
              <Button onClick={handleSave} loading={saving} className="flex-1">{t("steps_save_btn") as string}</Button>
            </div>
          </div>
        )}
      </div>

      {user && firebaseUser && (
        <Leaderboard entries={entries} currentUserId={firebaseUser.uid} members={wing?.members} />
      )}
    </div>
  );
}

export default function StepsPage() {
  return (
    <Suspense>
      <StepsPageInner />
    </Suspense>
  );
}
