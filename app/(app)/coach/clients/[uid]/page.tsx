"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, ClipboardList, MessageSquare, Trophy } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils/cn";
import { CoachGate } from "@/components/coach/CoachGate";
import { ChallengePanel, MessagePanel, type ClientWing } from "@/components/coach/CoachClientActions";
import { useCoachAccount } from "@/hooks/useCoachAccount";
import { PersonalThread } from "@/components/feed/PersonalThread";
import { PostCard } from "@/components/feed/PostCard";
import { getCoachClients, getMemberRecentMeals, getWingPosts } from "@/lib/firebase/firestore";
import type { ClientStatus, StatusFlag } from "@/lib/coach/status";
import type { Meal, WingPost } from "@/types";

const FLAG_STYLE: Record<StatusFlag, string> = {
  silent: "bg-red-50 text-red-600 border-red-200",
  no_data: "bg-red-50 text-red-600 border-red-200",
  weight_up: "bg-orange-50 text-orange-600 border-orange-200",
  low_logging: "bg-amber-50 text-amber-700 border-amber-200",
  new: "bg-wing-elevated text-wing-muted border-wing-border",
};

function flagText(f: StatusFlag, c: ClientStatus, he: boolean): string {
  switch (f) {
    case "silent": return he ? `לא פעיל/ה ${c.daysSinceActivity} ימים` : `Inactive ${c.daysSinceActivity} days`;
    case "no_data": return he ? "אין נתונים" : "No data";
    case "weight_up": return he ? "עלייה במשקל" : "Weight rising";
    case "low_logging": return he ? "רישום דל" : "Light logging";
    case "new": return he ? "חדש/ה" : "New";
  }
}

const ago = (n: number | null, he: boolean) =>
  n == null ? "—" : he ? (n === 0 ? "היום" : n === 1 ? "אתמול" : `לפני ${n} ימים`) : n === 0 ? "today" : n === 1 ? "yesterday" : `${n} days ago`;

// One client, everything the dietitian does with them: see how they're doing,
// write to them, open a challenge, manage their menu.
function ClientHub() {
  const { uid } = useParams<{ uid: string }>();
  const { firebaseUser, user, lang } = useCoachAccount();
  const he = lang === "he";
  const router = useRouter();

  const [status, setStatus] = useState<ClientStatus | null | undefined>(undefined);
  const [wings, setWings] = useState<ClientWing[]>([]);
  const [name, setName] = useState("");
  const [photoURL, setPhotoURL] = useState<string | undefined>();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [panel, setPanel] = useState<null | "message" | "challenge">(null);
  const [feed, setFeed] = useState<{ post: WingPost; wingId: string }[] | null>(null);

  const load = useCallback(async () => {
    if (!firebaseUser) return;
    try {
      const rows = (await getCoachClients(firebaseUser.uid)).filter((c) => c.uid === uid);
      setWings(rows.map((r) => ({ wingId: r.wingId, wingName: r.wingName, isPrivate: r.isPrivate })));
      if (rows[0]) { setName(rows[0].displayName); setPhotoURL(rows[0].photoURL); }
      if (rows.length === 0) { setStatus(null); return; }

      const token = await firebaseUser.getIdToken();
      const res = await fetch("/api/coach/status", { headers: { Authorization: `Bearer ${token}` } });
      const data = res.ok ? ((await res.json()) as { clients: ClientStatus[] }) : { clients: [] };
      setStatus(data.clients.find((c) => c.uid === uid) ?? null);

      // Feed: everything in the private 1-on-1 wing, only this client's posts in group wings.
      const feeds = await Promise.all(rows.map(async (r) => (await getWingPosts(r.wingId, 30).catch(() => [] as WingPost[])).filter((p) => r.isPrivate || p.userId === uid).map((post) => ({ post, wingId: r.wingId }))));
      setFeed(feeds.flat().sort((a, b) => (b.post.createdAt?.toMillis?.() ?? 0) - (a.post.createdAt?.toMillis?.() ?? 0)).slice(0, 12));

      const all = await Promise.all(rows.map((r) => getMemberRecentMeals(r.wingId, uid, 6).catch(() => [] as Meal[])));
      setMeals(all.flat().sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0)).slice(0, 6));
    } catch {
      setStatus(null);
    }
  }, [firebaseUser, uid]);

  useEffect(() => { load(); }, [load]);

  const actions = useMemo(
    () => [
      { id: "message" as const, icon: MessageSquare, label: he ? "פוסט בפיד" : "Feed post" },
      { id: "challenge" as const, icon: Trophy, label: he ? "אתגר" : "Challenge" },
    ],
    [he]
  );

  if (status === null && wings.length === 0) {
    return <p className="p-4 pt-16 text-center text-sm text-wing-muted" dir={he ? "rtl" : "ltr"}>{he ? "הלקוח לא נמצא ברשימה שלך" : "Client not found in your list"}</p>;
  }

  const c = status ?? undefined;
  const cal = c ? (c.calorieTarget ? `${c.todayCalories} / ${c.calorieTarget}` : `${c.todayCalories}`) : "";

  return (
    <div className="p-4 space-y-4" dir={he ? "rtl" : "ltr"}>
      <div className="pt-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-full bg-wing-elevated border border-wing-border shrink-0" aria-label={he ? "חזרה" : "Back"}>
          <ArrowRight size={18} className={cn("text-wing-ink", !he && "rotate-180")} />
        </button>
        <Avatar name={name || uid} photoURL={photoURL} size={44} className="shrink-0" />
        <div className="min-w-0">
          <h1 className="font-bold text-wing-ink text-lg truncate">{name}</h1>
          <p className="text-xs text-wing-muted truncate">{wings.map((w) => (w.isPrivate ? (he ? "פרטי" : "Private") : w.wingName)).join(" · ")}</p>
        </div>
      </div>

      {status === undefined ? (
        <div className="h-36 bg-wing-elevated border border-wing-border rounded-[20px] animate-pulse" />
      ) : c ? (
        <div className="bg-wing-surface border border-wing-border rounded-[20px] p-4 space-y-3">
          {c.flags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {c.flags.map((f) => <span key={f} className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full border", FLAG_STYLE[f])}>{flagText(f, c, he)}</span>)}
            </div>
          )}
          <div className="flex gap-1" dir="ltr" aria-label={he ? "פעילות 7 ימים אחרונים" : "Activity, last 7 days"}>
            {c.last7.map((on, i) => <span key={i} className={cn("flex-1 h-2 rounded-full", on ? "bg-wing-success" : "bg-wing-border")} />)}
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-wing-muted">
            <p>{he ? "צ'ק-אין אחרון: " : "Last check-in: "}<span className="text-wing-ink font-medium">{ago(c.daysSinceCheckin, he)}</span></p>
            <p>{he ? "ארוחה אחרונה: " : "Last meal: "}<span className="text-wing-ink font-medium">{ago(c.daysSinceMeal, he)}</span></p>
            <p>{he ? "קלוריות היום: " : "Calories today: "}<span className="text-wing-ink font-medium tabular" dir="ltr">{cal}</span></p>
            <p>{he ? "משקל: " : "Weight: "}<span className="text-wing-ink font-medium tabular">
              {c.weightKg != null ? <>{c.weightKg} {he ? "ק\"ג" : "kg"}{c.weightChangeKg ? <span className={cn("ms-1", c.weightChangeKg < 0 ? "text-wing-success" : "text-red-500")} dir="ltr">({c.weightChangeKg > 0 ? "+" : ""}{c.weightChangeKg})</span> : null}</> : "—"}
            </span></p>
            {c.streak > 0 && <p className="col-span-2">{he ? "רצף צ'ק-אין: " : "Check-in streak: "}<span className="text-wing-ink font-medium">{c.streak} {he ? "ימים" : "days"}</span></p>}
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-3 gap-2">
        {actions.map((a) => (
          <button key={a.id} onClick={() => setPanel(panel === a.id ? null : a.id)} className={cn("flex flex-col items-center gap-1.5 rounded-2xl py-3.5 border transition-colors", panel === a.id ? "bg-wing-ink text-wing-elevated border-wing-ink" : "bg-wing-surface border-wing-border text-wing-ink")}>
            <a.icon size={20} />
            <span className="text-xs font-bold">{a.label}</span>
          </button>
        ))}
        <button onClick={() => router.push(`/coach/menu/${uid}`)} className="flex flex-col items-center gap-1.5 rounded-2xl py-3.5 border bg-wing-surface border-wing-border text-wing-ink">
          <ClipboardList size={20} />
          <span className="text-xs font-bold">{he ? "תפריט" : "Menu"}</span>
        </button>
      </div>

      {panel === "message" && <MessagePanel lang={lang} clientId={uid} clientName={name} wings={wings} onDone={() => { setPanel(null); load(); }} />}
      {panel === "challenge" && <ChallengePanel lang={lang} wings={wings} onDone={() => setPanel(null)} />}

      {wings.length > 0 && firebaseUser && user && (
        <PersonalThread
          lang={lang}
          myId={firebaseUser.uid}
          myName={user.displayName}
          otherId={uid}
          otherName={name}
          title={he ? `שיחה פרטית עם ${name}` : `Private chat with ${name}`}
          readWingIds={wings.map((w) => w.wingId)}
          writeWingId={[...wings].sort((a, b) => Number(b.isPrivate) - Number(a.isPrivate))[0].wingId}
        />
      )}

      <div className="space-y-3">
        <h2 className="font-bold text-wing-ink text-sm px-1">{he ? "הפיד של הלקוח" : "Client's feed"}</h2>
        {feed === null ? (
          <div className="h-20 bg-wing-elevated border border-wing-border rounded-2xl animate-pulse" />
        ) : feed.length === 0 ? (
          <p className="text-sm text-wing-muted text-center py-4">{he ? "אין עדיין פוסטים" : "No posts yet"}</p>
        ) : (
          feed.map((f) => (
            <PostCard
              key={f.post.id}
              post={f.post}
              wingId={f.wingId}
              currentUserId={firebaseUser!.uid}
              currentUserName={user?.displayName ?? ""}
              isViewerAdmin
              onUpdate={(next) => setFeed((prev) => (prev ?? []).map((x) => (x.post.id === next.id ? { ...x, post: next } : x)))}
              onDelete={(id) => setFeed((prev) => (prev ?? []).filter((x) => x.post.id !== id))}
            />
          ))
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-bold text-wing-ink text-sm">{he ? "ארוחות אחרונות" : "Recent meals"}</h2>
          {wings[0] && <button onClick={() => router.push(`/member/${uid}?wing=${wings[0].wingId}`)} className="text-xs font-bold text-wing-heat">{he ? "תצוגה מלאה" : "Full view"}</button>}
        </div>
        {meals.length === 0 ? (
          <p className="text-sm text-wing-muted text-center py-4">{he ? "אין ארוחות רשומות" : "No meals logged"}</p>
        ) : (
          meals.map((m) => (
            <div key={m.id} className="flex items-center gap-3 bg-wing-surface border border-wing-border rounded-2xl px-3 py-2.5">
              {m.imageURL && /* eslint-disable-next-line @next/next/no-img-element */ <img src={m.imageURL} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-wing-ink truncate">{m.analysis?.description || (he ? "ארוחה" : "Meal")}</p>
                <p className="text-[11px] text-wing-muted tabular">{m.mealDate ?? ""} {m.mealTime ?? ""}</p>
              </div>
              <span className="text-sm font-black text-wing-ink tabular shrink-0">{Math.round(m.analysis?.calories ?? 0)}</span>
            </div>
          ))
        )}
      </div>
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
