"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Send, Stethoscope } from "lucide-react";
import { collection, limit as fsLimit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { addWallMessage, type WallMessage } from "@/lib/firebase/firestore";
import { cn } from "@/lib/utils/cn";

/**
 * A two-way private thread between a dietitian and one client, stored as wall
 * messages in both directions (coach -> client and client -> coach). Used at the
 * top of the client's feed and in the coach's client hub, so replies are visible
 * to both sides.
 */
export function PersonalThread({
  lang,
  myId,
  myName,
  otherId,
  otherName,
  readWingIds,
  writeWingId,
  title,
  limit = 6,
  maxAgeDays = 30,
}: {
  lang: "he" | "en";
  myId: string;
  myName: string;
  otherId: string;
  otherName: string;
  readWingIds: string[];
  writeWingId: string;
  title?: string;
  limit?: number;
  maxAgeDays?: number;
}) {
  const he = lang === "he";
  const [msgs, setMsgs] = useState<WallMessage[] | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const key = readWingIds.join(",");

  // Live: one listener per (wing, direction); every snapshot re-merges the thread.
  useEffect(() => {
    const ids = [...new Set(readWingIds)];
    const buckets = new Map<string, WallMessage[]>();
    const cutoff = Date.now() - maxAgeDays * 86_400_000;
    const recompute = () => {
      const seen = new Set<string>();
      const merged = [...buckets.values()]
        .flat()
        .filter((m) => (m.authorId === otherId && m.targetUserId === myId) || (m.authorId === myId && m.targetUserId === otherId))
        .filter((m) => (m.createdAt?.toMillis?.() ?? Date.now()) > cutoff && !seen.has(m.id) && seen.add(m.id))
        .sort((a, b) => (a.createdAt?.toMillis?.() ?? Date.now()) - (b.createdAt?.toMillis?.() ?? Date.now()));
      setMsgs(merged.slice(-limit));
    };
    if (ids.length === 0) { setMsgs([]); return; }
    const unsubs = ids.flatMap((w) =>
      [myId, otherId].map((target) =>
        onSnapshot(
          query(collection(db, "wings", w, "wallMessages"), where("targetUserId", "==", target), orderBy("createdAt", "desc"), fsLimit(20)),
          (snap) => {
            buckets.set(`${w}:${target}`, snap.docs.map((d) => ({ ...(d.data({ serverTimestamps: "estimate" }) as Omit<WallMessage, "id">), id: d.id })));
            recompute();
          },
          () => { buckets.set(`${w}:${target}`, []); recompute(); }
        )
      )
    );
    return () => unsubs.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, myId, otherId, limit, maxAgeDays]);

  async function send() {
    const body = text.trim();
    if (!body || !writeWingId || sending) return;
    setSending(true);
    try {
      const msg = { wingId: writeWingId, targetUserId: otherId, authorId: myId, authorName: myName, text: body };
      await addWallMessage(writeWingId, msg);
      fetch("/api/notifications/wall-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...msg, message: body }),
      }).catch(() => {});
      setText("");
    } finally {
      setSending(false);
    }
  }

  const time = (m: WallMessage) => (m.createdAt?.toDate ? format(m.createdAt.toDate(), "d/M HH:mm") : he ? "עכשיו" : "now");

  return (
    <div className="bg-wing-elevated border-2 border-wing-honey/40 rounded-[20px] p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Stethoscope size={16} className="text-wing-heat" />
        <p className="text-xs font-bold text-wing-heat">{title ?? (he ? `שיחה עם ${otherName}` : `Chat with ${otherName}`)}</p>
      </div>

      {msgs && msgs.length > 0 && (
        <div className="space-y-2">
          {msgs.map((m) => {
            const mine = m.authorId === myId;
            return (
              <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[85%] rounded-2xl px-3 py-2 text-sm", mine ? "bg-wing-ink text-wing-elevated" : "bg-wing-surface border border-wing-border text-wing-ink")}>
                  <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>
                  <p className={cn("text-[10px] mt-0.5 tabular", mine ? "text-wing-elevated/60" : "text-wing-subtle")}>{time(m)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") send(); }}
          placeholder={he ? "כתבו תשובה..." : "Write a reply..."}
          className="flex-1 text-sm border border-wing-border rounded-2xl px-3 py-2.5 bg-wing-surface focus:outline-none focus:ring-2 focus:ring-wing-ink text-wing-ink placeholder:text-wing-subtle"
        />
        <button onClick={send} disabled={!text.trim() || sending} aria-label={he ? "שליחה" : "Send"} className="px-4 py-2.5 rounded-2xl bg-wing-ink text-wing-elevated disabled:opacity-40 active:scale-95 transition-transform">
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
