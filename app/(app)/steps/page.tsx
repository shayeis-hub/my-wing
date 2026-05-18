"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Leaderboard } from "@/components/steps/Leaderboard";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { saveSteps, getWingSteps, getTodayCheckin } from "@/lib/firebase/firestore";
import { syncGoogleFitSteps } from "@/lib/fitness/googleFit";
import toast from "react-hot-toast";
import { format } from "date-fns";
import type { StepsEntry } from "@/types";

export default function StepsPage() {
  const { user, firebaseUser } = useAuth();
  const [entries, setEntries] = useState<StepsEntry[]>([]);
  const [manualSteps, setManualSteps] = useState("");
  const [saving, setSaving] = useState(false);
  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    if (!user?.wingId || !firebaseUser) return;
    Promise.all([
      getWingSteps(user.wingId, today),
      getTodayCheckin(user.wingId, firebaseUser.uid, today),
    ]).then(([stepsEntries, checkin]) => {
      // If steps were saved via check-in but not yet in steps collection, show them
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

  const myEntry = entries.find((e) => e.userId === firebaseUser?.uid);
  const [editing, setEditing] = useState(false);
  const [syncing, setSyncing] = useState(false);

  async function handleGoogleFitSync() {
    if (!firebaseUser || !user?.wingId) return;
    setSyncing(true);
    try {
      const steps = await syncGoogleFitSteps(firebaseUser);
      if (steps === 0) {
        toast("לא נמצאו צעדים היום ב-Google Fit", { icon: "👟" });
        return;
      }
      await saveSteps(user.wingId, {
        wingId: user.wingId,
        userId: firebaseUser.uid,
        userName: user.displayName,
        date: today,
        steps,
      });
      setEntries((prev) => {
        const filtered = prev.filter((e) => e.userId !== firebaseUser.uid);
        return [...filtered, {
          id: `${firebaseUser.uid}_${today}`,
          wingId: user.wingId!,
          userId: firebaseUser.uid,
          userName: user.displayName,
          date: today,
          steps,
          createdAt: null as unknown as StepsEntry["createdAt"],
        }];
      });
      setEditing(false);
      toast.success(`סונכרן מ-Google Fit: ${steps.toLocaleString()} צעדים 🎉`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "שגיאה";
      if (msg.includes("popup-closed")) return; // user cancelled
      toast.error(`שגיאה בסנכרון: ${msg}`);
    } finally {
      setSyncing(false);
    }
  }

  async function handleSave() {
    if (!user?.wingId || !firebaseUser || !manualSteps) return;
    const steps = parseInt(manualSteps);
    if (isNaN(steps) || steps < 0) {
      toast.error("מספר צעדים לא תקין");
      return;
    }
    setSaving(true);
    try {
      await saveSteps(user.wingId, {
        wingId: user.wingId,
        userId: firebaseUser.uid,
        userName: user.displayName,
        date: today,
        steps,
      });
      setEntries((prev) => {
        const filtered = prev.filter((e) => e.userId !== firebaseUser.uid);
        return [...filtered, {
          id: `${firebaseUser.uid}_${today}`,
          wingId: user.wingId!,
          userId: firebaseUser.uid,
          userName: user.displayName,
          date: today,
          steps,
          createdAt: null as unknown as StepsEntry["createdAt"],
        }];
      });
      toast.success(`${steps.toLocaleString()} צעדים נשמרו! 👟`);
      setManualSteps("");
      setEditing(false);
    } catch {
      toast.error("שגיאה בשמירה");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="pt-4">
        <h1 className="text-xl font-bold text-slate-800">צעדים</h1>
        <p className="text-sm text-slate-500">{format(new Date(), "d MMMM yyyy")}</p>
      </div>

      {/* My steps */}
      <Card>
        <h3 className="font-semibold text-slate-800 mb-3">הצעדים שלי היום</h3>
        {myEntry && !editing ? (
          <div className="text-center py-3 space-y-3">
            <p className="text-4xl font-bold text-wing-primary">
              {myEntry.steps.toLocaleString()}
            </p>
            <p className="text-slate-400 text-sm">צעדים</p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => { setManualSteps(String(myEntry.steps)); setEditing(true); }}
                className="text-sm text-slate-400 underline"
              >
                עדכן ידנית
              </button>
              <button
                onClick={handleGoogleFitSync}
                disabled={syncing}
                className="text-sm text-wing-primary underline disabled:opacity-50"
              >
                {syncing ? "מסנכרן..." : "🔄 עדכן מ-Google Fit"}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              onClick={handleGoogleFitSync}
              disabled={syncing}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-slate-200 text-sm font-medium text-slate-500 hover:border-wing-primary hover:text-wing-primary transition-colors disabled:opacity-50"
            >
              <span>🔄</span>
              {syncing ? "מסנכרן מ-Google Fit..." : "סנכרן מ-Google Fit"}
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
                <Button variant="secondary" onClick={() => setEditing(false)} className="flex-1">
                  בטל
                </Button>
              )}
              <Button onClick={handleSave} loading={saving} className="flex-1">
                שמור צעדים
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Leaderboard */}
      {user && firebaseUser && (
        <Leaderboard entries={entries} currentUserId={firebaseUser.uid} />
      )}
    </div>
  );
}
