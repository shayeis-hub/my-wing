"use client";

import { useEffect, useState, useCallback } from "react";
import Script from "next/script";
import { useAuth } from "@/hooks/useAuth";
import { Leaderboard } from "@/components/steps/Leaderboard";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { saveSteps, getWingSteps, getTodayCheckin } from "@/lib/firebase/firestore";
import { syncGoogleFitSteps, autoSyncGoogleFitSteps, wasGoogleFitConnected } from "@/lib/fitness/googleFit";
import toast from "react-hot-toast";
import { format } from "date-fns";
import type { StepsEntry } from "@/types";

export default function StepsPage() {
  const { user, firebaseUser } = useAuth();
  const [entries, setEntries] = useState<StepsEntry[]>([]);
  const [manualSteps, setManualSteps] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [gisReady, setGisReady] = useState(false);
  const today = format(new Date(), "yyyy-MM-dd");

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

  // Auto-sync when GIS script is ready and user was previously connected
  useEffect(() => {
    if (!gisReady || !firebaseUser || !user?.wingId) return;
    if (!wasGoogleFitConnected()) return;
    setSyncing(true);
    autoSyncGoogleFitSteps()
      .then(async (steps) => {
        if (steps && steps > 0) {
          await saveAndUpdateEntries(steps);
        }
      })
      .catch(() => {})
      .finally(() => setSyncing(false));
  }, [gisReady, firebaseUser, user?.wingId]);

  async function handleGoogleFitSync() {
    if (!firebaseUser || !user?.wingId) return;
    setSyncing(true);
    try {
      const steps = await syncGoogleFitSteps(firebaseUser);
      if (steps === 0) {
        toast("לא נמצאו צעדים היום ב-Google Fit", { icon: "👟" });
        return;
      }
      await saveAndUpdateEntries(steps);
      toast.success(`סונכרן מ-Google Fit: ${steps.toLocaleString()} צעדים 🎉`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "שגיאה";
      if (msg.includes("popup-closed")) return;
      toast.error(`שגיאה בסנכרון: ${msg}`);
    } finally {
      setSyncing(false);
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
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setGisReady(true)}
      />

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
              {syncing && <p className="text-xs text-slate-400 animate-pulse">מסנכרן מ-Google Fit...</p>}
              {!syncing && (
                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => { setManualSteps(String(myEntry.steps)); setEditing(true); }}
                    className="text-sm text-slate-400 underline"
                  >
                    עדכן ידנית
                  </button>
                  <button
                    onClick={handleGoogleFitSync}
                    className="text-sm text-wing-primary underline"
                  >
                    🔄 עדכן מ-Google Fit
                  </button>
                </div>
              )}
            </div>
          ) : !syncing && (
            <div className="space-y-3">
              <button
                onClick={handleGoogleFitSync}
                disabled={syncing}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-slate-200 text-sm font-medium text-slate-500 hover:border-wing-primary hover:text-wing-primary transition-colors disabled:opacity-50"
              >
                <span>🔄</span>
                סנכרן מ-Google Fit
              </button>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <div className="flex-1 h-px bg-slate-200" />
                <span>או הכנס ידנית</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>
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
    </>
  );
}
