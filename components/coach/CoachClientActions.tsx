"use client";

import { useEffect, useMemo, useState } from "react";
import { addDays, format } from "date-fns";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { useWing } from "@/hooks/useWing";
import { addWallMessage, createWingPost, finishChallenge, saveChallenge } from "@/lib/firebase/firestore";
import type { Challenge } from "@/types";
import { cn } from "@/lib/utils/cn";

type Lang = "he" | "en";
export interface ClientWing { wingId: string; wingName: string; isPrivate: boolean }

const inputCls = "w-full bg-wing-surface border border-wing-border rounded-xl px-3 py-2 text-sm text-wing-ink";
const labelCls = "text-xs font-bold text-wing-muted mb-1.5";

/** Where a message can go: a feed (private 1-on-1 wing or a group) or the client's personal wall. */
function useTargets(wings: ClientWing[], clientName: string, he: boolean) {
  return useMemo(() => {
    const ordered = [...wings].sort((a, b) => Number(b.isPrivate) - Number(a.isPrivate));
    const feeds = ordered.map((w) => ({
      key: `feed:${w.wingId}`,
      kind: "feed" as const,
      wingId: w.wingId,
      label: w.isPrivate ? (he ? "הפיד הפרטי שלכם" : "Your private feed") : he ? `פיד הקבוצה "${w.wingName}" (כולם רואים)` : `Group feed "${w.wingName}" (everyone sees)`,
    }));
    const wall = ordered[0]
      ? [{ key: `wall:${ordered[0].wingId}`, kind: "wall" as const, wingId: ordered[0].wingId, label: he ? `הודעה אישית ל${clientName} (בראש הפיד שלו + התראה, רק הוא רואה)` : `Personal message to ${clientName} (top of their feed + push, only they see it)` }]
      : [];
    return [...feeds, ...wall];
  }, [wings, clientName, he]);
}

export function MessagePanel({ lang, clientId, clientName, wings, onDone }: { lang: Lang; clientId: string; clientName: string; wings: ClientWing[]; onDone: () => void }) {
  const he = lang === "he";
  const { user, firebaseUser } = useAuth();
  const targets = useTargets(wings, clientName, he);
  const [targetKey, setTargetKey] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => { if (!targetKey && targets[0]) setTargetKey(targets[0].key); }, [targets, targetKey]);
  const target = targets.find((t) => t.key === targetKey);

  async function send() {
    const body = text.trim();
    if (!body || !target || !firebaseUser || !user) return;
    setSending(true);
    try {
      const authorName = user.displayName;
      if (target.kind === "feed") {
        await createWingPost(target.wingId, {
          wingId: target.wingId,
          userId: firebaseUser.uid,
          userName: authorName,
          ...(user.photoURL ? { userPhotoURL: user.photoURL } : {}),
          text: body,
          reactions: [],
          comments: [],
        });
        fetch("/api/notifications/feed-post", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wingId: target.wingId, authorId: firebaseUser.uid, authorName, preview: body }),
        }).catch(() => {});
      } else {
        const msg = { wingId: target.wingId, targetUserId: clientId, authorId: firebaseUser.uid, authorName, text: body };
        await addWallMessage(target.wingId, msg);
        fetch("/api/notifications/wall-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...msg, message: body }),
        }).catch(() => {});
      }
      toast.success(he ? "ההודעה נשלחה" : "Message sent");
      setText("");
      onDone();
    } catch {
      toast.error(he ? "השליחה נכשלה" : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="bg-wing-surface border border-wing-border rounded-[20px] p-4 space-y-3">
      <div>
        <p className={labelCls}>{he ? "לאן לשלוח" : "Send to"}</p>
        <div className="space-y-1.5">
          {targets.map((t) => (
            <button key={t.key} onClick={() => setTargetKey(t.key)} className={cn("w-full text-start text-sm px-3 py-2 rounded-xl border", targetKey === t.key ? "border-wing-ink bg-wing-elevated font-semibold text-wing-ink" : "border-wing-border text-wing-muted")}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <textarea className={`${inputCls} min-h-[96px]`} value={text} onChange={(e) => setText(e.target.value)} placeholder={he ? "כתבו הודעה, עידוד או הנחיה..." : "Write a message, encouragement or guidance..."} />
      <Button className="w-full" onClick={send} loading={sending} disabled={!text.trim() || !target}>{he ? "שליחה" : "Send"}</Button>
    </div>
  );
}

const TYPES: { value: Challenge["type"]; he: string; en: string; target: string }[] = [
  { value: "steps", he: "צעדים", en: "Steps", target: "8000" },
  { value: "water", he: "מים (ליטר)", en: "Water (liters)", target: "2" },
  { value: "vegetables", he: "ירקות (ארוחות)", en: "Veggies (meals)", target: "2" },
  { value: "no_sugar", he: "בלי סוכר", en: "No sugar", target: "1" },
  { value: "other", he: "אחר", en: "Other", target: "1" },
];

export function ChallengePanel({ lang, wings, onDone }: { lang: Lang; wings: ClientWing[]; onDone: () => void }) {
  const he = lang === "he";
  const ordered = useMemo(() => [...wings].sort((a, b) => Number(b.isPrivate) - Number(a.isPrivate)), [wings]);
  const [wingId, setWingId] = useState(ordered[0]?.wingId ?? "");
  const { wing } = useWing(wingId);
  const [type, setType] = useState<Challenge["type"]>("steps");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [unit, setUnit] = useState("");
  const [target, setTarget] = useState("8000");
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(addDays(new Date(), 7), "yyyy-MM-dd"));
  const [saving, setSaving] = useState(false);

  const active = wing?.activeChallenge;
  const wingLabel = (w: ClientWing) => (w.isPrivate ? (he ? "האתגר הפרטי שלכם" : "Your private challenge") : he ? `קבוצת "${w.wingName}" (לכולם)` : `Group "${w.wingName}" (everyone)`);

  function pickType(t: Challenge["type"]) {
    setType(t);
    setTarget(TYPES.find((x) => x.value === t)!.target);
  }

  async function create() {
    if (!wingId || !title.trim() || !(+target > 0)) return;
    if (endDate < startDate) { toast.error(he ? "תאריך הסיום חייב להיות אחרי ההתחלה" : "End date must be after the start"); return; }
    setSaving(true);
    try {
      await saveChallenge(wingId, {
        wingId,
        title: title.trim(),
        description: description.trim(),
        type,
        ...(type === "other" && unit.trim() ? { unit: unit.trim() } : {}),
        targetValue: +target,
        startDate,
        endDate,
        progress: {},
        status: "active",
      });
      toast.success(he ? "האתגר נפתח" : "Challenge started");
      onDone();
    } catch {
      toast.error(he ? "פתיחת האתגר נכשלה" : "Couldn't start the challenge");
    } finally {
      setSaving(false);
    }
  }

  async function finishNow() {
    if (!active || !window.confirm(he ? "לסיים את האתגר עכשיו ולחלק גביעים?" : "Finish the challenge now and award trophies?")) return;
    try {
      await finishChallenge(wingId, active.id);
      toast.success(he ? "האתגר הסתיים" : "Challenge finished");
    } catch {
      toast.error(he ? "הסיום נכשל" : "Couldn't finish");
    }
  }

  return (
    <div className="bg-wing-surface border border-wing-border rounded-[20px] p-4 space-y-3">
      {ordered.length > 1 && (
        <div>
          <p className={labelCls}>{he ? "עבור" : "For"}</p>
          <div className="space-y-1.5">
            {ordered.map((w) => (
              <button key={w.wingId} onClick={() => setWingId(w.wingId)} className={cn("w-full text-start text-sm px-3 py-2 rounded-xl border", wingId === w.wingId ? "border-wing-ink bg-wing-elevated font-semibold text-wing-ink" : "border-wing-border text-wing-muted")}>
                {wingLabel(w)}
              </button>
            ))}
          </div>
        </div>
      )}

      {active ? (
        <div className="space-y-3">
          <div className="bg-wing-elevated border border-wing-border rounded-2xl p-3.5">
            <p className="text-xs font-bold text-wing-heat mb-1">{he ? "יש כבר אתגר פעיל" : "An active challenge is already running"}</p>
            <p className="font-bold text-wing-ink text-sm">{active.title}</p>
            <p className="text-xs text-wing-muted mt-0.5">{active.startDate} – {active.endDate}</p>
          </div>
          <p className="text-xs text-wing-muted">{he ? "אפשר לפתוח אתגר חדש רק אחרי שהנוכחי מסתיים." : "A new challenge can start once the current one ends."}</p>
          <button onClick={finishNow} className="w-full py-2.5 rounded-2xl border border-wing-border text-sm font-bold text-wing-ink">{he ? "סיום האתגר עכשיו" : "Finish it now"}</button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {TYPES.map((t) => (
              <button key={t.value} onClick={() => pickType(t.value)} className={cn("text-xs font-semibold px-3 py-1.5 rounded-full border", type === t.value ? "bg-wing-ink text-wing-elevated border-wing-ink" : "bg-wing-surface text-wing-muted border-wing-border")}>
                {he ? t.he : t.en}
              </button>
            ))}
          </div>
          <input className={inputCls} placeholder={he ? "שם האתגר" : "Challenge name"} value={title} onChange={(e) => setTitle(e.target.value)} />
          <input className={inputCls} placeholder={he ? "תיאור קצר (לא חובה)" : "Short description (optional)"} value={description} onChange={(e) => setDescription(e.target.value)} />
          {type === "other" && <input className={inputCls} placeholder={he ? "יחידת מדידה (ק״מ, דקות...)" : "Unit (km, minutes...)"} value={unit} onChange={(e) => setUnit(e.target.value)} />}
          <div>
            <p className={labelCls}>{he ? "יעד יומי" : "Daily target"}</p>
            <input className={inputCls} type="number" step="any" dir="ltr" value={target} onChange={(e) => setTarget(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><p className={labelCls}>{he ? "התחלה" : "Start"}</p><input className={inputCls} type="date" dir="ltr" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
            <div><p className={labelCls}>{he ? "סיום" : "End"}</p><input className={inputCls} type="date" dir="ltr" min={startDate} value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
          </div>
          <Button className="w-full" onClick={create} loading={saving} disabled={!title.trim() || !(+target > 0)}>{he ? "פתיחת האתגר" : "Start the challenge"}</Button>
        </>
      )}
    </div>
  );
}
