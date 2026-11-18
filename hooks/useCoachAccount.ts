"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/lib/i18n";
import { COACH_PLANS, isCoachActive, type CoachPlanId } from "@/lib/subscription";
import { PLAN_META } from "@/components/coach/planMeta";

/** The signed-in dietitian's plan state and the few plan actions (trial, upgrade/cancel by mail). */
export function useCoachAccount() {
  const { user, firebaseUser } = useAuth();
  const { lang } = useLanguage();
  const he = lang === "he";
  const [busy, setBusy] = useState(false);

  const coach = user?.coach;
  const isActive = user?.accountType === "business" && isCoachActive(coach);
  const trialDaysLeft =
    coach?.plan === "free" && coach.expiresAt
      ? Math.max(0, Math.ceil((new Date(coach.expiresAt).getTime() - Date.now()) / 86400000))
      : null;
  const planLabel = coach ? COACH_PLANS[coach.plan].label : "";
  const maxClients = coach?.maxClients ?? null;

  async function startTrial() {
    setBusy(true);
    try {
      const token = (await firebaseUser?.getIdToken()) ?? "";
      const res = await fetch("/api/coach/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan: "free" }),
      });
      if (!res.ok) throw new Error();
      toast.success(he ? "ההתנסות הופעלה" : "Trial started");
    } catch {
      toast.error(he ? "שגיאה בהפעלה" : "Activation failed");
    } finally {
      setBusy(false);
    }
  }

  // Paid plans have no self-serve purchase right now (PayPal was removed), so
  // upgrades and cancellations go through support by mail.
  function contactUpgrade(planId: CoachPlanId) {
    const planName = planId === "free" ? "" : PLAN_META[planId].name;
    window.location.href = `mailto:contact@wingpact.app?subject=${encodeURIComponent(he ? `שדרוג למסלול ${planName}` : `Upgrade to the ${planName} plan`)}`;
  }
  function cancelPlan() {
    window.location.href = `mailto:contact@wingpact.app?subject=${encodeURIComponent(he ? "ביטול מנוי דיאטנ/ית" : "Cancel dietitian subscription")}`;
  }

  return { user, firebaseUser, coach, isActive, trialDaysLeft, planLabel, maxClients, busy, startTrial, contactUpgrade, cancelPlan, lang };
}
