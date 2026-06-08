"use client";

import { useEffect } from "react";
import { AuthGuard } from "@/components/layout/AuthGuard";
import { BottomNav } from "@/components/layout/BottomNav";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { consumeWidgetActions, isNativeApp, pushWidgetData } from "@/lib/widget/native";
import { getTodayCheckin, saveCheckin } from "@/lib/firebase/firestore";

// Keeps the i18n gender in sync with the signed-in user's profile so all
// Hebrew strings render in the correct masculine/feminine form.
function GenderSync() {
  const { user } = useAuth();
  const { setGender } = useLanguage();
  useEffect(() => {
    const gd = user?.profile?.gender;
    if (gd === "female" || gd === "male") setGender(gd);
  }, [user?.profile?.gender, setGender]);
  return null;
}

// Local yyyy-MM-dd (matches the dashboard's checkin key).
function todayKey(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// Handles interactions performed on the home-screen widget while the app was
// closed: applies water +/- deltas to today's check-in, and sends a queued SOS.
// Runs on mount and whenever the app returns to the foreground.
function WidgetActions() {
  const { user, firebaseUser } = useAuth();

  useEffect(() => {
    if (!isNativeApp() || !firebaseUser || !user?.wingId) return;
    const wingId = user.wingId;
    const uid = firebaseUser.uid;
    const userName = user.displayName;

    async function applyWaterDelta(delta: number) {
      const today = todayKey();
      const tc = await getTodayCheckin(wingId, uid, today);
      const cur = tc?.waterGlasses ?? 0;
      const next = Math.max(0, Math.min(4, Math.round((cur + delta) * 10) / 10));
      const merged = {
        wingId,
        userId: uid,
        userName,
        date: today,
        waterGlasses: next,
        vegetablesServings: tc?.vegetablesServings ?? 0,
        mood: tc?.mood ?? 3,
        workout: tc?.workout ?? { done: false },
        ...(tc?.steps ? { steps: tc.steps } : {}),
        ...(tc?.weightKg ? { weightKg: tc.weightKg } : {}),
        ...(tc?.notes ? { notes: tc.notes } : {}),
        ...(tc?.eatingWindow ? { eatingWindow: tc.eatingWindow } : {}),
      };
      await saveCheckin(wingId, merged);
      await pushWidgetData(null, next); // keep widget in sync with the clamped value
    }

    async function sendSos() {
      try {
        await fetch("/api/notifications/sos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wingId, userId: uid, userName }),
        });
        const toast = (await import("react-hot-toast")).default;
        toast.success("SOS נשלח לחברי הכנף");
      } catch { /* network error — ignore */ }
    }

    async function handle() {
      const { waterDelta, sos } = await consumeWidgetActions();
      if (waterDelta !== 0) { try { await applyWaterDelta(waterDelta); } catch { /* ignore */ } }
      if (sos) { await sendSos(); }
    }

    handle();
    let remove = () => {};
    import("@capacitor/app").then(({ App }) => {
      const sub = App.addListener("resume", handle);
      remove = () => { void sub.then((s) => s.remove()); };
    });
    return () => remove();
  }, [firebaseUser, user?.wingId, user?.displayName]);

  return null;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { dir } = useLanguage();
  return (
    <AuthGuard>
      <GenderSync />
      <WidgetActions />
      <div className="min-h-screen bg-wing-bg" dir={dir}>
        <main className="max-w-lg mx-auto" style={{ paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))' }}>{children}</main>
        <BottomNav />
      </div>
    </AuthGuard>
  );
}
