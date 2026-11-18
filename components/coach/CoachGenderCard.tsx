"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { knownGender } from "@/lib/utils/gender";

/**
 * One-time question to the dietitian: how should the app address you? Accounts
 * start with a placeholder gender, so until they answer, texts stay neutral.
 * Disappears once answered.
 */
export function CoachGenderCard({ he }: { he: boolean }) {
  const { user, firebaseUser } = useAuth();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (!user || done || knownGender(user)) return null;

  async function choose(gender: "male" | "female") {
    setBusy(true);
    try {
      const token = (await firebaseUser?.getIdToken()) ?? "";
      const res = await fetch("/api/coach/gender", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ gender }),
      });
      if (!res.ok) throw new Error();
      setDone(true);
    } catch {
      toast.error(he ? "השמירה נכשלה, נסו שוב" : "Couldn't save, try again");
    } finally {
      setBusy(false);
    }
  }

  const btn = "flex-1 py-2.5 rounded-xl border border-wing-border bg-wing-surface text-sm font-bold text-wing-ink disabled:opacity-50";
  return (
    <div className="bg-wing-elevated border border-wing-border rounded-2xl px-4 py-3.5">
      <p className="text-sm font-bold text-wing-ink">{he ? "איך לפנות אליך?" : "How should we address you?"}</p>
      <p className="text-xs text-wing-muted mt-0.5 mb-3">
        {he ? "ככה הלקוחות והאפליקציה יפנו אליך בלשון הנכונה (הדיאטנית / הדיאטן)." : "Used to word the app for you and your clients."}
      </p>
      <div className="flex gap-2">
        <button className={btn} disabled={busy} onClick={() => choose("female")}>{he ? "בלשון נקבה (דיאטנית)" : "Female"}</button>
        <button className={btn} disabled={busy} onClick={() => choose("male")}>{he ? "בלשון זכר (דיאטן)" : "Male"}</button>
      </div>
    </div>
  );
}
