"use client";

import { useEffect, useRef, useState } from "react";
import { useCoachAccount } from "@/hooks/useCoachAccount";
import { PlanPicker } from "@/components/coach/PlanPicker";

/**
 * Wraps every dietitian page: while the plan is inactive it shows the plan
 * picker instead of the page. Also self-heals a trial that an old abandoned
 * checkout clobbered (an inactive paid plan that still carries a valid trial
 * expiry), once per load.
 */
export function CoachGate({ children }: { children: React.ReactNode }) {
  const { coach, firebaseUser, isActive, busy, startTrial, contactUpgrade, lang } = useCoachAccount();
  const he = lang === "he";
  const syncedRef = useRef(false);
  const [syncing, setSyncing] = useState(false);

  const corruptedTrial =
    !!coach && coach.active === false && coach.plan !== "free" && !!coach.expiresAt && new Date(coach.expiresAt).getTime() > Date.now();

  useEffect(() => {
    if (!firebaseUser || syncedRef.current || isActive || !corruptedTrial) return;
    syncedRef.current = true;
    setSyncing(true);
    (async () => {
      try {
        const token = (await firebaseUser.getIdToken()) ?? "";
        await fetch("/api/coach/repair-trial", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      } catch (err) {
        console.error("Coach sync:", err);
      } finally {
        setSyncing(false);
      }
    })();
  }, [firebaseUser, isActive, corruptedTrial]);

  if (!isActive && syncing) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 mx-auto rounded-full border-4 border-wing-border border-t-wing-heat animate-spin" />
          <p className="text-sm text-wing-muted">{he ? "מאמת את המנוי שלך…" : "Verifying your subscription…"}</p>
        </div>
      </div>
    );
  }

  if (!isActive) {
    return (
      <div className="p-4 md:py-8" dir={he ? "rtl" : "ltr"}>
        <PlanPicker lang={lang} heading showTrial={!coach?.expiresAt} busy={busy} onStartTrial={startTrial} onContactUpgrade={contactUpgrade} />
      </div>
    );
  }

  return <>{children}</>;
}
