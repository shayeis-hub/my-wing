"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils/cn";
import { CoachGate } from "@/components/coach/CoachGate";
import { CoachChat } from "@/components/coach/CoachChat";
import { ClientDataView } from "@/components/coach/ClientDataView";
import type { ClientWing } from "@/components/coach/CoachClientActions";
import { useCoachAccount } from "@/hooks/useCoachAccount";
import { getCoachClients } from "@/lib/firebase/firestore";
import type { ClientStatus, StatusFlag } from "@/lib/coach/status";
import { g3 } from "@/lib/utils/gender";

const FLAG_STYLE: Record<StatusFlag, string> = {
  silent: "bg-red-50 text-red-600 border-red-200",
  no_data: "bg-red-50 text-red-600 border-red-200",
  weight_up: "bg-orange-50 text-orange-600 border-orange-200",
  menu_off: "bg-orange-50 text-orange-600 border-orange-200",
  low_logging: "bg-amber-50 text-amber-700 border-amber-200",
  new: "bg-wing-elevated text-wing-muted border-wing-border",
};

function flagText(f: StatusFlag, c: ClientStatus, he: boolean): string {
  switch (f) {
    case "silent": return he ? `${g3(c.gender, "לא פעיל", "לא פעילה", "לא פעיל/ה")} ${c.daysSinceActivity} ימים` : `Inactive ${c.daysSinceActivity} days`;
    case "no_data": return he ? "אין נתונים" : "No data";
    case "weight_up": return he ? "עלייה במשקל" : "Weight rising";
    case "menu_off": return he ? "חריגות מהתפריט" : "Off the menu";
    case "low_logging": return he ? "רישום דל" : "Light logging";
    case "new": return he ? g3(c.gender, "חדש", "חדשה", "חדש/ה") : "New";
  }
}

// One client as a WhatsApp-style conversation: header with how they're doing,
// then the live stream (messages, meals, posts, events) and the input.
function ClientHub() {
  const { uid } = useParams<{ uid: string }>();
  const { firebaseUser, user, lang } = useCoachAccount();
  const he = lang === "he";
  const router = useRouter();

  const [status, setStatus] = useState<ClientStatus | null | undefined>(undefined);
  const [wings, setWings] = useState<ClientWing[]>([]);
  const [name, setName] = useState("");
  const [photoURL, setPhotoURL] = useState<string | undefined>();
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<"chat" | "data">("chat");
  const getToken = useCallback(async () => (await firebaseUser?.getIdToken()) ?? "", [firebaseUser]);

  const load = useCallback(async () => {
    if (!firebaseUser) return;
    try {
      const rows = (await getCoachClients(firebaseUser.uid)).filter((c) => c.uid === uid);
      if (rows.length === 0) { setNotFound(true); return; }
      setWings(rows.map((r) => ({ wingId: r.wingId, wingName: r.wingName, isPrivate: r.isPrivate })));
      setName(rows[0].displayName);
      setPhotoURL(rows[0].photoURL);
      const token = await firebaseUser.getIdToken();
      const res = await fetch("/api/coach/status", { headers: { Authorization: `Bearer ${token}` } });
      const data = res.ok ? ((await res.json()) as { clients: ClientStatus[] }) : { clients: [] };
      setStatus(data.clients.find((c) => c.uid === uid) ?? null);
    } catch {
      setStatus(null);
    }
  }, [firebaseUser, uid]);

  useEffect(() => { load(); }, [load]);

  if (notFound) {
    return <p className="p-4 pt-16 text-center text-sm text-wing-muted" dir={he ? "rtl" : "ltr"}>{he ? "הלקוח לא נמצא ברשימה שלך" : "Client not found in your list"}</p>;
  }

  const c = status ?? undefined;
  const cal = c ? (c.calorieTarget ? `${c.todayCalories}/${c.calorieTarget}` : `${c.todayCalories}`) : "";

  return (
    <div className="chat-screen flex flex-col" style={{ height: "calc(100dvh - 5.5rem - env(safe-area-inset-bottom, 0px))" }} dir={he ? "rtl" : "ltr"}>
      <div className="shrink-0 bg-wing-surface border-b border-wing-border px-3 pt-3 pb-2.5">
        <div className="flex items-center gap-2.5">
          <button onClick={() => router.back()} className="p-2 -ms-1 rounded-full shrink-0" aria-label={he ? "חזרה" : "Back"}>
            <ArrowRight size={20} className={cn("text-wing-ink", !he && "rotate-180")} />
          </button>
          <Avatar name={name || uid} photoURL={photoURL} size={38} className="shrink-0" />
          <div className="min-w-0 flex-1">
            <h1 className="font-bold text-wing-ink text-base truncate">{name}</h1>
            <p className="text-[11px] text-wing-muted truncate">{wings.map((w) => (w.isPrivate ? (he ? "פרטי" : "Private") : w.wingName)).join(" · ")}</p>
          </div>
          {c && (
            <div className="flex gap-0.5 shrink-0" dir="ltr" aria-label={he ? "פעילות 7 ימים אחרונים" : "Activity, last 7 days"}>
              {c.last7.map((on, i) => <span key={i} className={cn("w-1.5 h-1.5 rounded-full", on ? "bg-wing-success" : "bg-wing-border")} />)}
            </div>
          )}
        </div>
        {c && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-wing-muted">
            {c.flags.map((f) => <span key={f} className={cn("font-bold px-2 py-0.5 rounded-full border", FLAG_STYLE[f])}>{flagText(f, c, he)}</span>)}
            <span>{he ? "קלוריות " : "Cal "}<b className="text-wing-ink tabular" dir="ltr">{cal}</b></span>
            {c.weightKg != null && (
              <span>{he ? "משקל " : "Weight "}<b className="text-wing-ink tabular">{c.weightKg}</b>
                {c.weightChangeKg ? <span className={cn("ms-1", c.weightChangeKg < 0 ? "text-wing-success" : "text-red-500")} dir="ltr">({c.weightChangeKg > 0 ? "+" : ""}{c.weightChangeKg})</span> : null}
              </span>
            )}
            {c.streak > 0 && <span>{he ? "רצף " : "Streak "}<b className="text-wing-ink">{c.streak}</b></span>}
          </div>
        )}
      </div>

      <div className="shrink-0 grid grid-cols-2 gap-1.5 px-3 py-2 bg-wing-surface border-b border-wing-border">
        {(["chat", "data"] as const).map((tb) => (
          <button
            key={tb}
            onClick={() => setTab(tb)}
            aria-pressed={tab === tb}
            className={cn("py-2 rounded-xl text-sm font-bold border", tab === tb ? "bg-wing-ink text-wing-elevated border-wing-ink" : "bg-wing-elevated text-wing-muted border-wing-border")}
          >
            {tb === "chat" ? (he ? "פתיחת שיחה" : "Chat") : he ? "פתיחת נתונים" : "Data"}
          </button>
        ))}
      </div>

      {tab === "data" && firebaseUser && <ClientDataView clientId={uid} getToken={getToken} he={he} />}

      {tab === "chat" && firebaseUser && user && wings.length > 0 && (
        <CoachChat lang={lang} coachId={firebaseUser.uid} coachName={user.displayName} clientId={uid} clientName={name} wings={wings} />
      )}
    </div>
  );
}

export default function CoachClientPage() {
  return (
    <CoachGate>
      <ClientHub />
    </CoachGate>
  );
}
