"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Leaderboard } from "@/components/steps/Leaderboard";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { saveSteps, getWingSteps, getTodayCheckin } from "@/lib/firebase/firestore";
import { connectGoogleFit, fetchStepsFromServer } from "@/lib/fitness/googleFit";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { useSearchParams } from "next/navigation";
import type { StepsEntry } from "@/types";
import { Suspense } from "react";

function StepsPageInner() {
  const { user, firebaseUser } = useAuth();
  const searchParams = useSearchParams();
  const [entries, setEntries] = useState<StepsEntry[]>([]);
  const [manualSteps, setManualSteps] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [fitConnected, setFitConnected] = useState<boolean | null>(null);
  const today = format(new Date(), "yyyy-MM-dd");

  // Handle redirect back from OAuth
  useEffect(() => {
    if (searchParams.get("fitConnected") === "1") {
      toast.success("Google Fit חובר בהצלחה! 🎉");
      window.history.replaceState({}, "", "/steps");
    }
    if (searchParams.get("fitError")) {
      toast.error("שגיאה בחיבור Google Fit");
      window.history.replaceState({}, "", "/steps");
    }
  }, [searchParams]);

  useEffect(() => {
    if (!user?.wingId || !firebaseUser) return;
    Promise.all([
      getWingSteps(user.wingId, today),
      getTodayCheckin(user.wingId, firebaseUser.uid, today),
    ]).then(([stepsEntries, checkin]) => {
      const hasMyEntry = stepsEntries.some((e) => e.userId === firebaseUser.uid);
      if (!hasMyEntry && checkin?.steps) {
        setEntries([
          ...stepsEntries,
          {
            id: `${firebaseUser.uid}_${today}`,
            wingId: user.wingId!,
            userId: firebaseUser.uid,
            userName: user.displayName,
            date: today,
            steps: checkin.steps,
            createdAt: null as unknown as import("firebase/firestore").Timestamp,
          },
        ]);
      } else {
        setEntries(stepsEntries);
      }
    });
  }, [user?.wingId, firebaseUser, today]);

  const saveAndUpdateEntries = useCallback(async (steps: number) => {
    if (!user?.wingId || !firebaseUser) return;
    await saveSteps(user.wingId, {
      wingId: user.wingId,
      userId: firebaseUser.uid,
      userName: user.displayName,
      date: today,
      steps,
    });
    setEntries((prev) => [
      ...prev.filter((e) => e.userId !== firebaseUser.uid),
      {
        id: `${firebaseUser.uid}_${today}`,
        wingId: user.wingId!,
        userId: firebaseUser.uid,
        userName: user.displayName,
        date: today,
        steps,
        createdAt: null as unknown as StepsEntry["createdAt"],
      },
    ]);
    setEditing(false);
  }, [user, firebaseUser, today]);

  // Auto-sync from server on page load
  useEffect(() => {
    if (!firebaseUser) return;
    setSyncing(true);
    fetchStepsFromServer(firebaseUser.uid)
      .then(async ({ connected, steps }) => {
        setFitConnected(connected);
        if (connected && steps && steps > 0) {
          await saveAndUpdateEntries(steps);
        }
      })
      .catch(() => setFitConnected(false))
      .finally(() => setSyncing(false));
  }, [firebaseUser]);

  async function handleManualSync() {
    if (!firebaseUser) return;
    setSyncing(true);
    const { connected, steps } = await fetchStepsFromServer(firebaseUser.uid).finally(() => setSyncing(false));
    setFitConnected(connected);
    if (connected && steps && steps > 0) {
      await saveAndUpdateEntries(steps);
      toast.success(`סונכרן: ${steps.toLocaleString()} צעדים 🎉`);
    }
  }

  async function handleSave() {
    if (!user?.wingId || !firebaseUser || !manualSteps) return;
    const steps = parseInt(manualSteps);
    if (isNaN(steps) || steps < 0) { toast.error("מספר צעדים לא תקין"); return; }
    setSaving(true);
    try {
      await saveAndUpdateEntries(steps);
      toast.success(`${steps.toLocaleString()} צעדים נשמרו! 👟`);
      setManualSteps("");
    } catch {
      toast.error("שגיאה בשמירה");
    } finally {
      setSaving(false);
    }
  }

  const myEntry = entries.find((e) => e.userId === firebaseUser?.uid);

  return (
    <div className="p-4 space-y-4">
      <div className="pt-4">
        <h1 className="text-xl font-bold text-slate-800">צעדים</h1>
        <p className="text-sm text-slate-500">{format(new Date(), "d MMMM yyyy")}</p>
      </div>

      <Card>
        <h3 className="font-semibold text-slate-800 mb-3">הצעדים שלי היום</h3>

        {syncing && !myEntry && (
          <div className="text-center py-6 text-slate-400 text-sm animate-pulse">
            🔄 מסנכרן מ-Google Fit...
          </div>
        )}

        {myEntry && !editing ? (
          <div className="text-center py-3 space-y-3">
            <p className="text-4xl font-bold text-wing-primary">
              {myEntry.steps.toLocaleString()}
            </p>
            <p className="text-slate-400 text-sm">צעדים</p>
            {syncing
              ? <p className="text-xs text-slate-400 animate-pulse">מסנכרן...</p>
              : (
                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => { setManualSteps(String(myEntry.steps)); setEditing(true); }}
                    className="text-sm text-slate-400 underline"
                  >
                    עדכן ידנית
                  </button>
                  {fitConnected && (
                    <button onClick={handleManualSync} className="text-sm text-wing-primary underline">
                      🔄 רענן
                    </button>
                  )}
                </div>
              )
            }
          </div>
        ) : !syncing && (
          <div className="space-y-3">
            {fitConnected === false && firebaseUser && (
              <button
                onClick={() => connectGoogleFit(firebaseUser.uid)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-white border-2 border-slate-200 text-sm font-medium text-slate-600 hover:border-wing-primary hover:text-wing-primary transition-colors"
              >
                <img src="https://www.gstatic.com/images/branding/product/1x/gsa_android_48dp.png" alt="" className="w-5 h-5" />
                חבר Google Fit לסנכרון אוטומטי
              </button>
            )}

            {fitConnected === false && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <div className="flex-1 h-px bg-slate-200" />
                <span>או הכנס ידנית</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>
            )}

            <Input
              type="number"
              value={manualSteps}
              onChange={(e) => setManualSteps(e.target.value)}
              placeholder="הכנס מספר צעדים..."
              dir="ltr"
            />
            <div className="flex gap-2">
              {editing && (
                <Button variant="secondary" onClick={() => setEditing(false)} className="flex-1">בטל</Button>
              )}
              <Button onClick={handleSave} loading={saving} className="flex-1">שמור צעדים</Button>
            </div>
          </div>
        )}
      </Card>

      {user && firebaseUser && (
        <Leaderboard entries={entries} currentUserId={firebaseUser.uid} />
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
