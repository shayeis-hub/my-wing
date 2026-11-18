"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Users, Link2, Copy, Trash2, UserPlus, UsersRound, Check, ClipboardList, Share2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { CoachGate } from "@/components/coach/CoachGate";
import { PLAN_META } from "@/components/coach/planMeta";
import { useCoachAccount } from "@/hooks/useCoachAccount";
import { useUnreadMessages } from "@/hooks/useChat";
import { CountBadge } from "@/components/ui/CountBadge";
import { ShareInviteSheet, type InviteShare } from "@/components/coach/ShareInviteSheet";
import { COACH_PLANS } from "@/lib/subscription";
import { getCoachClients, getCoachInvites, type CoachClient, type CoachInvite } from "@/lib/firebase/firestore";

// Client roster + invite links. Status lives on the home screen; this is where
// clients get added and removed.
function ClientsManager() {
  const { firebaseUser, user, coach, planLabel, maxClients, trialDaysLeft, contactUpgrade, lang } = useCoachAccount();
  const he = lang === "he";
  const router = useRouter();
  const [clients, setClients] = useState<CoachClient[]>([]);
  const [invites, setInvites] = useState<CoachInvite[]>([]);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [share, setShare] = useState<InviteShare | null>(null);
  const unread = useUnreadMessages(firebaseUser?.uid);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const reload = useCallback(async () => {
    if (!firebaseUser) return;
    const [c, i] = await Promise.all([getCoachClients(firebaseUser.uid), getCoachInvites(firebaseUser.uid)]);
    setClients(c);
    setInvites(i);
  }, [firebaseUser]);

  useEffect(() => { reload(); }, [reload]);

  async function authedFetch(path: string, method: string, body: unknown) {
    const token = (await firebaseUser?.getIdToken()) ?? "";
    return fetch(path, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
  }

  function copyLink(token: string) {
    navigator.clipboard.writeText(`${origin}/join/${token}`);
    setCopied(token);
    setTimeout(() => setCopied(null), 1500);
  }

  async function createInvite(type: "private" | "group") {
    const label = window.prompt(type === "private" ? (he ? "שם הלקוח/ה (לזיהוי בלבד):" : "Client name (for your reference):") : (he ? "שם הקבוצה:" : "Group name:"));
    if (label === null) return;
    setBusy(true);
    try {
      const res = await authedFetch("/api/coach/invite", "POST", { type, label: type === "private" ? label.trim() || undefined : label });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed");
      copyLink(data.token);
      toast.success(type === "private" ? (he ? "קישור פרטי נוצר והועתק" : "Private link created & copied") : (he ? "קבוצה נוצרה וקישור הועתק" : "Group created & link copied"));
      setShare({ url: `${origin}/join/${data.token}`, type, label: label.trim() || undefined });
      reload().catch(console.error);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      toast.error(msg === "COACH_LIMIT_REACHED" ? (he ? "הגעת למגבלת הלקוחות במסלול הנוכחי — שדרג/י כדי להוסיף עוד" : "Client limit reached — upgrade to add more") : (he ? "שגיאה ביצירה" : "Failed"));
    } finally {
      setBusy(false);
    }
  }

  async function deleteInvite(code: string) {
    setInvites((prev) => prev.filter((i) => i.code !== code));
    try { await authedFetch("/api/coach/invite", "DELETE", { code }); } catch { reload(); }
  }

  async function removeClient(c: CoachClient) {
    const confirmed = window.confirm(he ? `להסיר את ${c.displayName}? הם יתחילו תקופת ניסיון אישית של 21 יום.` : `Remove ${c.displayName}? They'll start a 21-day personal trial.`);
    if (!confirmed) return;
    try {
      const res = await authedFetch("/api/coach/remove-client", "POST", { clientId: c.uid, wingId: c.wingId });
      if (!res.ok) throw new Error();
      setClients((prev) => prev.filter((x) => !(x.uid === c.uid && x.wingId === c.wingId)));
      toast.success(he ? `${c.displayName} הוסר/ה` : `${c.displayName} removed`);
    } catch {
      toast.error(he ? "שגיאה בהסרה" : "Failed to remove");
    }
  }

  const atLimit = maxClients != null && clients.length >= maxClients;

  return (
    <div className="p-4 space-y-4" dir={he ? "rtl" : "ltr"}>
      <div className="pt-4">
        <h1 className="text-xl font-bold text-wing-ink">{he ? "לקוחות" : "Clients"}</h1>
        <p className="text-sm text-wing-muted mt-1">
          {planLabel} · {clients.length}{maxClients != null ? `/${maxClients}` : ""} {he ? "לקוחות" : "clients"}
          {coach?.plan === "free" && trialDaysLeft != null && (
            <span className="text-wing-honey font-medium"> · {he ? `נותרו ${trialDaysLeft} ימי ניסיון` : `${trialDaysLeft} trial days left`}</span>
          )}
        </p>
      </div>

      {atLimit && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-4 space-y-3">
          <div>
            <p className="text-sm font-bold text-red-700">{he ? `הגעת למגבלת ${maxClients} לקוחות במסלול ${planLabel}` : `You've reached the ${maxClients}-client limit on the ${planLabel} plan`}</p>
            <p className="text-xs text-red-500 mt-0.5">{he ? "שדרג/י כדי להוסיף לקוחות נוספים" : "Upgrade to add more clients"}</p>
          </div>
          <div className="flex flex-col gap-2">
            {(["basic", "extended", "unlimited"] as const)
              .filter((id) => { const m = COACH_PLANS[id].maxClients; return m === null || m > (maxClients ?? 0); })
              .map((id) => (
                <button key={id} onClick={() => contactUpgrade(id)} className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white border border-red-200 hover:border-wing-heat active:scale-[0.99] transition-transform">
                  <div className="text-start">
                    <span className="text-sm font-bold text-wing-ink">{PLAN_META[id].name}</span>
                    <span className="text-xs text-wing-muted mx-2">{PLAN_META[id].clients[lang]}</span>
                  </div>
                  <span className="text-sm font-black text-wing-heat">₪{COACH_PLANS[id].priceILS}<span className="text-xs font-normal text-wing-muted">{he ? "/חו׳" : "/mo"}</span></span>
                </button>
              ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => createInvite("private")} disabled={busy || atLimit} className="flex flex-col items-center gap-1.5 bg-wing-surface border border-wing-border rounded-2xl py-4 active:scale-[0.97] transition-transform disabled:opacity-50">
          <UserPlus size={22} className={atLimit ? "text-wing-muted" : "text-wing-heat"} />
          <span className="text-sm font-bold text-wing-ink">{he ? "לקוח פרטי" : "Private client"}</span>
          <span className="text-[11px] text-wing-muted">{atLimit ? (he ? "מלא" : "limit reached") : he ? "אחד על אחד" : "1-on-1"}</span>
        </button>
        <button onClick={() => createInvite("group")} disabled={busy || atLimit} className="flex flex-col items-center gap-1.5 bg-wing-surface border border-wing-border rounded-2xl py-4 active:scale-[0.97] transition-transform disabled:opacity-50">
          <UsersRound size={22} className={atLimit ? "text-wing-muted" : "text-wing-heat"} />
          <span className="text-sm font-bold text-wing-ink">{he ? "קבוצה" : "Group"}</span>
          <span className="text-[11px] text-wing-muted">{atLimit ? (he ? "מלא" : "limit reached") : he ? "כולם רואים הכל" : "shared wing"}</span>
        </button>
      </div>

      {invites.length > 0 && (
        <Card>
          <h3 className="font-semibold text-wing-ink mb-3 flex items-center gap-1.5"><Link2 size={16} className="text-wing-muted" />{he ? "קישורי הזמנה פרטיים" : "Private invite links"}</h3>
          <div className="space-y-2">
            {invites.map((inv) => (
              <div key={inv.code} className="flex items-center gap-2 bg-wing-elevated border border-wing-border rounded-2xl px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  {inv.label && <p className="text-sm font-semibold text-wing-ink truncate">{inv.label}</p>}
                  <p className="text-xs text-wing-muted truncate tabular" dir="ltr">/join/{inv.code}</p>
                </div>
                <span className="text-[11px] text-wing-subtle shrink-0">{inv.usedCount > 0 ? (he ? "נוצל" : "used") : ""}</span>
                <button onClick={() => setShare({ url: `${origin}/join/${inv.code}`, type: "private", label: inv.label || undefined })} className="text-wing-muted hover:text-wing-heat shrink-0" aria-label={he ? "שליחה" : "Share"}><Share2 size={15} /></button>
                <button onClick={() => copyLink(inv.code)} className="text-wing-muted hover:text-wing-ink shrink-0">{copied === inv.code ? <Check size={15} className="text-wing-success" /> : <Copy size={15} />}</button>
                <button onClick={() => deleteInvite(inv.code)} className="text-wing-subtle hover:text-red-500 shrink-0"><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <h3 className="font-semibold text-wing-ink mb-3 flex items-center gap-1.5"><Users size={16} className="text-wing-muted" />{he ? "הלקוחות שלי" : "My clients"}</h3>
        {clients.length === 0 ? (
          <p className="text-sm text-wing-muted text-center py-3">{he ? "אין עדיין לקוחות — צור/י קישור הזמנה" : "No clients yet — create an invite link"}</p>
        ) : (
          <div className="space-y-2">
            {clients.map((c) => (
              <div key={`${c.wingId}_${c.uid}`} className="flex items-center gap-2 bg-wing-elevated border border-wing-border rounded-2xl px-3 py-2.5">
                <button className="flex items-center gap-3 flex-1 min-w-0 text-start" onClick={() => router.push(`/coach/clients/${c.uid}`)}>
                  <Avatar name={c.displayName} photoURL={c.photoURL} size={36} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-wing-ink text-sm truncate flex items-center gap-1.5">{c.displayName}<CountBadge count={unread.byAuthor[c.uid] ?? 0} /></p>
                    <p className="text-[11px] text-wing-muted truncate">{c.isPrivate ? (he ? "פרטי" : "Private") : c.wingName}</p>
                  </div>
                </button>
                <button onClick={() => router.push(`/coach/menu/${c.uid}`)} className="text-wing-muted hover:text-wing-heat transition-colors shrink-0 p-1" title={he ? "תפריט ללקוח" : "Client menu"} aria-label={he ? "תפריט ללקוח" : "Client menu"}>
                  <ClipboardList size={16} />
                </button>
                <button onClick={() => removeClient(c)} className="text-wing-subtle hover:text-red-500 transition-colors shrink-0 p-1" title={he ? "הסר לקוח" : "Remove client"}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {share && <ShareInviteSheet share={share} coachName={user?.displayName ?? ""} lang={lang} onClose={() => setShare(null)} />}
    </div>
  );
}

export default function CoachClientsPage() {
  return (
    <CoachGate>
      <ClientsManager />
    </CoachGate>
  );
}
