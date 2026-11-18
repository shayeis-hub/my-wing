"use client";

import { Crown } from "lucide-react";
import { CoachGate } from "@/components/coach/CoachGate";
import { PlanPicker } from "@/components/coach/PlanPicker";
import { useCoachAccount } from "@/hooks/useCoachAccount";

function PlanPage() {
  const { coach, planLabel, maxClients, trialDaysLeft, contactUpgrade, cancelPlan, lang } = useCoachAccount();
  const he = lang === "he";
  const isPaid = coach?.plan !== "free";
  const expires = coach?.expiresAt
    ? new Date(coach.expiresAt).toLocaleDateString(he ? "he-IL" : "en-GB", { day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <div className="p-4 space-y-5" dir={he ? "rtl" : "ltr"}>
      <div className="pt-4">
        <h1 className="text-xl font-bold text-wing-ink flex items-center gap-2"><Crown size={20} className="text-wing-honey" />{he ? "המנוי שלי" : "My plan"}</h1>
      </div>

      <div className="bg-wing-surface border border-wing-border rounded-[20px] p-5 space-y-1">
        <p className="font-black text-lg text-wing-ink">{planLabel}</p>
        <p className="text-sm text-wing-muted">
          {maxClients != null ? (he ? `עד ${maxClients} לקוחות` : `Up to ${maxClients} clients`) : he ? "לקוחות ללא הגבלה" : "Unlimited clients"}
        </p>
        {coach?.plan === "free" && trialDaysLeft != null && (
          <p className="text-sm text-wing-honey font-medium">{he ? `נותרו ${trialDaysLeft} ימי ניסיון` : `${trialDaysLeft} trial days left`}</p>
        )}
        {coach?.cancelPending && expires && <p className="text-sm text-wing-heat">{he ? `פעיל עד ${expires}` : `Active until ${expires}`}</p>}
        {isPaid && !coach?.cancelPending && (
          <button onClick={cancelPlan} className="text-xs text-wing-subtle hover:text-red-500 transition-colors pt-2">{he ? "ביטול מנוי" : "Cancel plan"}</button>
        )}
      </div>

      <PlanPicker lang={lang} showTrial={false} onStartTrial={() => {}} onContactUpgrade={contactUpgrade} />
    </div>
  );
}

export default function CoachPlanPage() {
  return (
    <CoachGate>
      <PlanPage />
    </CoachGate>
  );
}
