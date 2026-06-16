"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/lib/i18n";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { COACH_PLANS, type CoachPlanId } from "@/lib/subscription";
import {
  getCoachClients,
  getCoachInvites,
  type CoachClient,
  type CoachInvite,
} from "@/lib/firebase/firestore";
import toast from "react-hot-toast";
import {
  Users, Link2, Copy, Trash2, UserPlus, UsersRound, Check, Crown,
} from "lucide-react";

export default function CoachPage() {
  const { user, firebaseUser } = useAuth();
  const { lang } = useLanguage();
  const router = useRouter();

  const [clients, setClients] = useState<CoachClient[]>([]);
  const [invites, setInvites] = useState<CoachInvite[]>([]);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const coach = user?.coach;
  const isActive = user?.accountType === "business" && coach?.active;
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const reload = useCallback(async () => {
    if (!firebaseUser) return;
    const [c, i] = await Promise.all([
      getCoachClients(firebaseUser.uid),
      getCoachInvites(firebaseUser.uid),
    ]);
    setClients(c);
    setInvites(i);
  }, [firebaseUser]);

  useEffect(() => {
    if (isActive) reload();
  }, [isActive, reload]);

  async function authedFetch(path: string, method: string, body: unknown) {
    const token = (await firebaseUser?.getIdToken()) ?? "";
    return fetch(path, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
  }

  async function handleActivate(plan: CoachPlanId) {
    setBusy(true);
    try {
      const res = await authedFetch("/api/coach/activate", "POST", { plan });
      if (!res.ok) throw new Error();
      toast.success(lang === "he" ? "המסלול הופעל" : "Plan activated");
    } catch {
      toast.error(lang === "he" ? "שגיאה בהפעלה" : "Activation failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreatePrivate() {
    setBusy(true);
    try {
      const res = await authedFetch("/api/coach/invite", "POST", { type: "private" });
      const data = await res.json();
      if (!res.ok) throw new Error();
      await reload();
      copyLink(data.token);
      toast.success(lang === "he" ? "קישור פרטי נוצר והועתק" : "Private link created & copied");
    } catch {
      toast.error(lang === "he" ? "שגיאה ביצירה" : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateGroup() {
    const name = window.prompt(lang === "he" ? "שם הקבוצה:" : "Group name:");
    if (name === null) return;
    setBusy(true);
    try {
      const res = await authedFetch("/api/coach/invite", "POST", { type: "group", label: name });
      const data = await res.json();
      if (!res.ok) throw new Error();
      copyLink(data.token);
      toast.success(lang === "he" ? "קבוצה נוצרה וקישור הועתק" : "Group created & link copied");
    } catch {
      toast.error(lang === "he" ? "שגיאה ביצירה" : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteInvite(code: string) {
    setInvites((prev) => prev.filter((i) => i.code !== code));
    try {
      await authedFetch("/api/coach/invite", "DELETE", { code });
    } catch {
      reload();
    }
  }

  function copyLink(token: string) {
    const url = `${origin}/join/${token}`;
    navigator.clipboard.writeText(url);
    setCopied(token);
    setTimeout(() => setCopied(null), 1500);
  }

  // ── Plan selection (no active plan) ─────────────────────────────────────────
  if (!isActive) {
    return (
      <div className="p-4 space-y-4" dir={lang === "he" ? "rtl" : "ltr"}>
        <div className="pt-4">
          <h1 className="text-xl font-bold text-wing-ink flex items-center gap-2">
            <Crown size={20} className="text-wing-honey" />
            {lang === "he" ? "חשבון עסקי" : "Business account"}
          </h1>
          <p className="text-sm text-wing-muted mt-1">
            {lang === "he"
              ? "בחר/י מסלול כדי לפתוח את דף ניהול הלקוחות"
              : "Choose a plan to unlock the client dashboard"}
          </p>
        </div>

        {(Object.keys(COACH_PLANS) as CoachPlanId[]).map((id) => {
          const p = COACH_PLANS[id];
          return (
            <Card key={id}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-wing-ink">{p.label}</p>
                  <p className="text-sm text-wing-muted mt-0.5">
                    ₪{p.priceILS} <span className="text-wing-subtle">/ {lang === "he" ? "חודש" : "mo"}</span>
                  </p>
                </div>
                <button
                  onClick={() => handleActivate(id)}
                  disabled={busy}
                  className="px-4 py-2 rounded-2xl bg-wing-ink text-wing-elevated text-sm font-bold disabled:opacity-50 active:scale-95 transition-transform"
                >
                  {lang === "he" ? "בחר/י" : "Select"}
                </button>
              </div>
            </Card>
          );
        })}
        <p className="text-[11px] text-wing-subtle text-center">
          {lang === "he"
            ? "* בשלב זה ההפעלה ללא חיוב — חיבור התשלום יתווסף בהמשך"
            : "* Activation is currently free — billing will be added"}
        </p>
      </div>
    );
  }

  // ── Active dashboard ────────────────────────────────────────────────────────
  const max = coach?.maxClients;
  const planLabel = coach ? COACH_PLANS[coach.plan].label : "";

  return (
    <div className="p-4 space-y-4" dir={lang === "he" ? "rtl" : "ltr"}>
      <div className="pt-4 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-wing-ink flex items-center gap-2">
            <Crown size={20} className="text-wing-honey" />
            {lang === "he" ? "ניהול לקוחות" : "Client management"}
          </h1>
          <p className="text-sm text-wing-muted mt-1">
            {planLabel} · {clients.length}
            {max != null ? `/${max}` : ""} {lang === "he" ? "לקוחות" : "clients"}
          </p>
        </div>
      </div>

      {/* Create actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleCreatePrivate}
          disabled={busy}
          className="flex flex-col items-center gap-1.5 bg-wing-surface border border-wing-border rounded-2xl py-4 active:scale-[0.97] transition-transform disabled:opacity-50"
        >
          <UserPlus size={22} className="text-wing-heat" />
          <span className="text-sm font-bold text-wing-ink">{lang === "he" ? "לקוח פרטי" : "Private client"}</span>
          <span className="text-[11px] text-wing-muted">{lang === "he" ? "אחד על אחד" : "1-on-1"}</span>
        </button>
        <button
          onClick={handleCreateGroup}
          disabled={busy}
          className="flex flex-col items-center gap-1.5 bg-wing-surface border border-wing-border rounded-2xl py-4 active:scale-[0.97] transition-transform disabled:opacity-50"
        >
          <UsersRound size={22} className="text-wing-heat" />
          <span className="text-sm font-bold text-wing-ink">{lang === "he" ? "קבוצה" : "Group"}</span>
          <span className="text-[11px] text-wing-muted">{lang === "he" ? "כולם רואים הכל" : "shared wing"}</span>
        </button>
      </div>

      {/* Pending private invites */}
      {invites.length > 0 && (
        <Card>
          <h3 className="font-semibold text-wing-ink mb-3 flex items-center gap-1.5">
            <Link2 size={16} className="text-wing-muted" />
            {lang === "he" ? "קישורי הזמנה פרטיים" : "Private invite links"}
          </h3>
          <div className="space-y-2">
            {invites.map((inv) => (
              <div key={inv.code} className="flex items-center gap-2 bg-wing-elevated border border-wing-border rounded-2xl px-3 py-2.5">
                <span className="flex-1 text-xs text-wing-muted truncate tabular" dir="ltr">
                  /join/{inv.code}
                </span>
                <span className="text-[11px] text-wing-subtle shrink-0">
                  {inv.usedCount > 0 ? (lang === "he" ? "נוצל" : "used") : ""}
                </span>
                <button onClick={() => copyLink(inv.code)} className="text-wing-muted hover:text-wing-ink shrink-0">
                  {copied === inv.code ? <Check size={15} className="text-wing-success" /> : <Copy size={15} />}
                </button>
                <button onClick={() => handleDeleteInvite(inv.code)} className="text-wing-subtle hover:text-red-500 shrink-0">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Clients */}
      <Card>
        <h3 className="font-semibold text-wing-ink mb-3 flex items-center gap-1.5">
          <Users size={16} className="text-wing-muted" />
          {lang === "he" ? "הלקוחות שלי" : "My clients"}
        </h3>
        {clients.length === 0 ? (
          <p className="text-sm text-wing-muted text-center py-3">
            {lang === "he" ? "אין עדיין לקוחות — צור/י קישור הזמנה" : "No clients yet — create an invite link"}
          </p>
        ) : (
          <div className="space-y-2">
            {clients.map((c) => (
              <button
                key={`${c.wingId}_${c.uid}`}
                onClick={() => {
                  // View this client's data in their specific wing context
                  router.push(`/member/${c.uid}?wing=${c.wingId}`);
                }}
                className="w-full flex items-center gap-3 bg-wing-elevated border border-wing-border rounded-2xl px-3 py-2.5 active:scale-[0.99] transition-transform text-start"
              >
                <Avatar name={c.displayName} photoURL={c.photoURL} size={36} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-wing-ink text-sm truncate">{c.displayName}</p>
                  <p className="text-[11px] text-wing-muted truncate">
                    {c.isPrivate ? (lang === "he" ? "פרטי" : "Private") : c.wingName}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
