"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { CoachGate } from "@/components/coach/CoachGate";
import { ClientStatusList } from "@/components/coach/ClientStatusList";
import { useCoachAccount } from "@/hooks/useCoachAccount";

// The dietitian's home: who needs attention, first thing on opening the app.
function CoachHome() {
  const { firebaseUser, user, coach, trialDaysLeft, contactUpgrade, lang } = useCoachAccount();
  const he = lang === "he";
  const router = useRouter();
  const getToken = useCallback(async () => (await firebaseUser?.getIdToken()) ?? "", [firebaseUser]);
  const first = user?.displayName?.split(" ")[0] ?? "";

  return (
    <div className="p-4 space-y-4" dir={he ? "rtl" : "ltr"}>
      <div className="pt-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-wing-ink tracking-tight">{he ? `שלום, ${first}` : `Hello, ${first}`}</h1>
          <p className="text-sm text-wing-muted mt-0.5">{he ? "הנה מצב הלקוחות שלך" : "Here's how your clients are doing"}</p>
        </div>
        <button
          onClick={() => router.push("/coach/clients")}
          className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-wing-ink text-wing-elevated text-sm font-bold"
        >
          <UserPlus size={15} />
          {he ? "הוספת לקוח" : "Add client"}
        </button>
      </div>

      {coach?.plan === "free" && trialDaysLeft != null && (
        <div className="bg-wing-elevated border border-wing-honey rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-sm text-wing-ink font-medium">
            {he ? `התנסות חינם · נותרו ${trialDaysLeft} ימים` : `Free trial · ${trialDaysLeft} days left`}
          </p>
          <button onClick={() => contactUpgrade("basic")} className="px-3 py-1.5 rounded-xl bg-wing-honey text-white text-xs font-bold shrink-0">
            {he ? "שדרוג" : "Upgrade"}
          </button>
        </div>
      )}

      <ClientStatusList lang={lang} getToken={getToken} onOpen={(c) => router.push(`/coach/clients/${c.uid}`)} />
    </div>
  );
}

export default function CoachPage() {
  return (
    <CoachGate>
      <CoachHome />
    </CoachGate>
  );
}
