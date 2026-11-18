"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { collection, limit as fsLimit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { ClipboardList, MessageSquare, Plus, Reply, Send, Trophy, X } from "lucide-react";
import { auth, db } from "@/lib/firebase/config";
import { addWallMessage, getWingChallenges, type WallMessage } from "@/lib/firebase/firestore";
import { markChatRead, useThreadMessages } from "@/hooks/useChat";
import { dayLabel, ReplyQuote } from "@/components/feed/PersonalThread";
import { ChallengePanel, MessagePanel, type ClientWing } from "@/components/coach/CoachClientActions";
import { cn } from "@/lib/utils/cn";
import type { Meal, WingPost } from "@/types";

type ReplyTo = NonNullable<WallMessage["replyTo"]>;

type Item =
  | { kind: "msg"; at: number; id: string; m: WallMessage }
  | { kind: "meal"; at: number; id: string; meal: Meal }
  | { kind: "post"; at: number; id: string; post: WingPost; mine: boolean }
  | { kind: "event"; at: number; id: string; text: string };

const tsMs = (t: unknown): number => (t as { toMillis?: () => number } | null | undefined)?.toMillis?.() ?? Date.now();

const MEAL_TYPE_HE: Record<string, string> = { breakfast: "בוקר", lunch: "צהריים", dinner: "ערב", snack: "נשנוש" };

/**
 * The dietitian's whole relationship with one client in a single WhatsApp-style
 * stream: private messages both ways, the client's meals and feed posts as
 * cards (tap to quote-reply), and system events (challenge opened, menu
 * published). Live; marks the conversation read while it is open.
 */
export function CoachChat({
  lang,
  coachId,
  coachName,
  clientId,
  clientName,
  wings,
}: {
  lang: "he" | "en";
  coachId: string;
  coachName: string;
  clientId: string;
  clientName: string;
  wings: ClientWing[];
}) {
  const he = lang === "he";
  const router = useRouter();
  const wingIds = useMemo(() => wings.map((w) => w.wingId), [wings]);
  const privateFirst = useMemo(() => [...wings].sort((a, b) => Number(b.isPrivate) - Number(a.isPrivate)), [wings]);
  const privateIds = useMemo(() => new Set(wings.filter((w) => w.isPrivate).map((w) => w.wingId)), [wings]);

  const msgs = useThreadMessages(wingIds, coachId, clientId, 150, 90);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [posts, setPosts] = useState<{ post: WingPost; wingId: string }[]>([]);
  const [events, setEvents] = useState<{ id: string; at: number; text: string }[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<ReplyTo | null>(null);
  const [sheet, setSheet] = useState<null | "menu" | "challenge" | "post">(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const wingKey = wingIds.join(",");

  // Meals + posts, live, per wing.
  useEffect(() => {
    if (wingIds.length === 0) return;
    const mealBuckets = new Map<string, Meal[]>();
    const postBuckets = new Map<string, { post: WingPost; wingId: string }[]>();
    const unsubs = wingIds.flatMap((w) => [
      onSnapshot(
        query(collection(db, "wings", w, "meals"), where("userId", "==", clientId), orderBy("createdAt", "desc"), fsLimit(15)),
        (snap) => {
          mealBuckets.set(w, snap.docs.map((d) => ({ ...(d.data({ serverTimestamps: "estimate" }) as Omit<Meal, "id">), id: d.id })));
          setMeals([...mealBuckets.values()].flat());
        },
        () => {}
      ),
      onSnapshot(
        query(collection(db, "wings", w, "posts"), orderBy("createdAt", "desc"), fsLimit(30)),
        (snap) => {
          postBuckets.set(
            w,
            snap.docs
              .map((d) => ({ post: { ...(d.data({ serverTimestamps: "estimate" }) as Omit<WingPost, "id">), id: d.id } as WingPost, wingId: w }))
              .filter((x) => privateIds.has(w) || x.post.userId === clientId)
          );
          setPosts([...postBuckets.values()].flat());
        },
        () => {}
      ),
    ]);
    return () => unsubs.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wingKey, clientId]);

  // System events: challenges opened, menu published (one-time).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const out: { id: string; at: number; text: string }[] = [];
      for (const w of wingIds) {
        const ch = await getWingChallenges(w).catch(() => []);
        ch.forEach((c) => out.push({ id: `ch-${c.id}`, at: tsMs(c.createdAt), text: he ? `נפתח אתגר: ${c.title}` : `Challenge started: ${c.title}` }));
      }
      try {
        const res = await fetch(`/api/coach/menu?clientId=${encodeURIComponent(clientId)}`, { headers: { Authorization: `Bearer ${(await auth.currentUser?.getIdToken()) ?? ""}` } });
        const data = res.ok ? await res.json() : null;
        if (data?.published?.publishedAt) out.push({ id: "menu-pub", at: new Date(data.published.publishedAt).getTime(), text: he ? "פורסם תפריט חדש" : "A new menu was published" });
      } catch { /* optional */ }
      if (!cancelled) setEvents(out);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wingKey, clientId, he]);

  const items = useMemo<Item[]>(() => {
    const list: Item[] = [];
    (msgs ?? []).forEach((m) => list.push({ kind: "msg", at: tsMs(m.createdAt), id: m.id, m }));
    meals.forEach((meal) => list.push({ kind: "meal", at: tsMs(meal.createdAt), id: meal.id, meal }));
    posts.forEach(({ post }) => list.push({ kind: "post", at: tsMs(post.createdAt), id: post.id, post, mine: post.userId === coachId }));
    events.forEach((e) => list.push({ kind: "event", at: e.at, id: e.id, text: e.text }));
    return list.sort((a, b) => a.at - b.at);
  }, [msgs, meals, posts, events, coachId]);

  // Newest at the bottom; mark read while open.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    if (msgs && msgs.length > 0 && document.visibilityState === "visible") markChatRead(coachId, clientId);
  }, [items.length, msgs, coachId, clientId]);

  async function send() {
    const body = text.trim();
    const writeWing = privateFirst[0]?.wingId;
    if (!body || !writeWing || sending) return;
    setSending(true);
    try {
      const msg = {
        wingId: writeWing,
        targetUserId: clientId,
        authorId: coachId,
        authorName: coachName,
        text: body,
        ...(replyTo ? { replyTo } : {}),
      };
      await addWallMessage(writeWing, msg);
      fetch("/api/notifications/wall-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wingId: writeWing, targetUserId: clientId, authorId: coachId, authorName: coachName, message: body }),
      }).catch(() => {});
      setText("");
      setReplyTo(null);
    } finally {
      setSending(false);
    }
  }

  const quoteMeal = (meal: Meal) => setReplyTo({ kind: "meal", id: meal.id, author: clientName, preview: `${meal.analysis?.description ?? (he ? "ארוחה" : "Meal")} · ${Math.round(meal.analysis?.calories ?? 0)} ${he ? 'קק"ל' : "kcal"}` });
  const quotePost = (p: WingPost) => setReplyTo({ kind: "post", id: p.id, author: p.userName, preview: p.text || (he ? "תמונה" : "Photo") });
  const quoteMsg = (m: WallMessage) => setReplyTo({ kind: "msg", id: m.id, author: m.authorName, preview: m.text });

  const sheetTitle = sheet === "challenge" ? (he ? "פתיחת אתגר" : "New challenge") : sheet === "post" ? (he ? "פוסט בפיד" : "Feed post") : "";

  return (
    <div className="flex-1 min-h-0 flex flex-col relative">
      <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 space-y-1.5 bg-wing-elevated/60">
        {items.length === 0 && <p className="text-center text-sm text-wing-muted py-12">{he ? `עוד אין פעילות עם ${clientName}. כתבו הודעה כדי להתחיל.` : `Nothing yet with ${clientName}. Write a message to start.`}</p>}
        {items.map((it, i) => {
          const d = new Date(it.at);
          const prev = i > 0 ? new Date(items[i - 1].at) : null;
          const sep = !prev || prev.toDateString() !== d.toDateString();
          return (
            <div key={`${it.kind}-${it.id}`}>
              {sep && <p className="text-center my-2"><span className="text-[10px] font-semibold text-wing-muted bg-wing-surface border border-wing-border rounded-full px-2.5 py-0.5">{dayLabel(d, he)}</span></p>}

              {it.kind === "event" && (
                <p className="text-center my-1"><span className="text-[11px] text-wing-muted bg-wing-surface/80 border border-wing-border rounded-full px-3 py-1">{it.text}</span></p>
              )}

              {it.kind === "msg" && (() => {
                const mine = it.m.authorId === coachId;
                return (
                  <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
                    <button onClick={() => quoteMsg(it.m)} className={cn("max-w-[85%] text-start rounded-2xl px-3 py-2 text-sm", mine ? "bg-wing-ink text-wing-elevated" : "bg-wing-surface border border-wing-border text-wing-ink")}>
                      {it.m.replyTo && <ReplyQuote r={it.m.replyTo} mine={mine} />}
                      <p className="leading-relaxed whitespace-pre-wrap">{it.m.text}</p>
                      <p className={cn("text-[10px] mt-0.5 tabular", mine ? "text-wing-elevated/60" : "text-wing-subtle")}>{format(d, "HH:mm")}</p>
                    </button>
                  </div>
                );
              })()}

              {it.kind === "meal" && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl bg-wing-surface border border-wing-border overflow-hidden">
                    {it.meal.imageURL && /* eslint-disable-next-line @next/next/no-img-element */ <img src={it.meal.imageURL} alt="" className="w-full max-h-44 object-cover" />}
                    <div className="px-3 py-2">
                      <p className="text-[10px] font-bold text-wing-heat">{he ? `ארוחה · ${MEAL_TYPE_HE[it.meal.mealType] ?? ""}` : "Meal"}</p>
                      <p className="text-sm text-wing-ink font-semibold">{it.meal.analysis?.description || (he ? "ארוחה" : "Meal")}</p>
                      <p className="text-xs text-wing-muted tabular">{Math.round(it.meal.analysis?.calories ?? 0)} {he ? 'קק"ל' : "kcal"} · P{Math.round(it.meal.analysis?.protein ?? 0)} C{Math.round(it.meal.analysis?.carbs ?? 0)} F{Math.round(it.meal.analysis?.fat ?? 0)}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-wing-subtle tabular">{format(d, "HH:mm")}</span>
                        <button onClick={() => quoteMeal(it.meal)} className="flex items-center gap-1 text-[11px] font-bold text-wing-heat"><Reply size={12} />{he ? "השב" : "Reply"}</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {it.kind === "post" && (
                <div className={cn("flex", it.mine ? "justify-end" : "justify-start")}>
                  <div className="max-w-[85%] rounded-2xl bg-wing-surface border border-wing-border overflow-hidden">
                    {it.post.imageURL && /* eslint-disable-next-line @next/next/no-img-element */ <img src={it.post.imageURL} alt="" className="w-full max-h-44 object-cover" />}
                    <div className="px-3 py-2">
                      <p className="text-[10px] font-bold text-wing-heat">{it.mine ? (he ? "פוסט שלך בפיד" : "Your feed post") : he ? "פוסט בפיד" : "Feed post"}</p>
                      {it.post.text && <p className="text-sm text-wing-ink whitespace-pre-wrap">{it.post.text}</p>}
                      <div className="flex items-center justify-between mt-1 gap-3">
                        <span className="text-[10px] text-wing-subtle tabular">{format(d, "HH:mm")}{(it.post.comments?.length ?? 0) > 0 ? ` · ${it.post.comments!.length} ${he ? "תגובות" : "comments"}` : ""}</span>
                        <button onClick={() => quotePost(it.post)} className="flex items-center gap-1 text-[11px] font-bold text-wing-heat"><Reply size={12} />{he ? "השב" : "Reply"}</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="shrink-0 bg-wing-surface border-t border-wing-border px-3 pt-2 pb-2 space-y-2">
        {replyTo && (
          <div className="flex items-start gap-2 bg-wing-elevated rounded-xl px-2.5 py-1.5">
            <div className="flex-1 min-w-0"><ReplyQuote r={replyTo} mine={false} /></div>
            <button onClick={() => setReplyTo(null)} aria-label={he ? "ביטול" : "Cancel"} className="p-1 text-wing-muted"><X size={14} /></button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <button onClick={() => setSheet("menu")} aria-label={he ? "פעולות" : "Actions"} className="w-10 h-10 rounded-full bg-wing-elevated border border-wing-border flex items-center justify-center text-wing-ink shrink-0"><Plus size={20} /></button>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") send(); }}
            placeholder={he ? `כתבו ל${clientName}...` : `Message ${clientName}...`}
            className="flex-1 text-sm border border-wing-border rounded-full px-4 py-2.5 bg-wing-surface focus:outline-none focus:ring-2 focus:ring-wing-ink text-wing-ink placeholder:text-wing-subtle"
          />
          <button onClick={send} disabled={!text.trim() || sending} aria-label={he ? "שליחה" : "Send"} className="w-10 h-10 rounded-full bg-wing-ink text-wing-elevated flex items-center justify-center disabled:opacity-40 shrink-0 active:scale-95 transition-transform"><Send size={16} /></button>
        </div>
      </div>

      {sheet && (
        <div className="absolute inset-0 z-30 flex flex-col justify-end bg-black/30" onClick={() => setSheet(null)}>
          <div className="bg-wing-bg rounded-t-[24px] p-4 max-h-[85%] overflow-y-auto space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="font-bold text-wing-ink">{sheet === "menu" ? (he ? "פעולות" : "Actions") : sheetTitle}</p>
              <button onClick={() => setSheet(null)} aria-label={he ? "סגירה" : "Close"} className="p-1 text-wing-muted"><X size={18} /></button>
            </div>
            {sheet === "menu" && (
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "challenge" as const, icon: Trophy, label: he ? "אתגר" : "Challenge" },
                  { id: "menu-page" as const, icon: ClipboardList, label: he ? "תפריט" : "Menu" },
                  { id: "post" as const, icon: MessageSquare, label: he ? "פוסט בפיד" : "Feed post" },
                ].map((a) => (
                  <button
                    key={a.id}
                    onClick={() => (a.id === "menu-page" ? router.push(`/coach/menu/${clientId}`) : setSheet(a.id))}
                    className="flex flex-col items-center gap-1.5 rounded-2xl py-4 border bg-wing-surface border-wing-border text-wing-ink"
                  >
                    <a.icon size={20} />
                    <span className="text-xs font-bold">{a.label}</span>
                  </button>
                ))}
              </div>
            )}
            {sheet === "challenge" && <ChallengePanel lang={lang} wings={wings} onDone={() => setSheet(null)} />}
            {sheet === "post" && <MessagePanel lang={lang} clientId={clientId} clientName={clientName} wings={wings} onDone={() => setSheet(null)} />}
          </div>
        </div>
      )}
    </div>
  );
}
