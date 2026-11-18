"use client";

import { useEffect, useRef, useState } from "react";
import { postAuthed } from "@/lib/utils/postAuthed";
import { format, isToday, isYesterday } from "date-fns";
import { Check, CheckCheck, Send, Stethoscope } from "lucide-react";
import { addWallMessage, type WallMessage } from "@/lib/firebase/firestore";
import { markChatRead, useOtherReadAt, useThreadMessages } from "@/hooks/useChat";
import { cn } from "@/lib/utils/cn";

export function dayLabel(d: Date, he: boolean): string {
  if (isToday(d)) return he ? "היום" : "Today";
  if (isYesterday(d)) return he ? "אתמול" : "Yesterday";
  return format(d, "d/M/yyyy");
}

/** WhatsApp-style delivery marks on my own messages: one tick = sent, two = the other person opened the chat after it. */
export function Ticks({ read, onDark }: { read: boolean; onDark: boolean }) {
  const Icon = read ? CheckCheck : Check;
  return <Icon size={12} className={cn("inline-block ms-1 -mt-0.5", read ? (onDark ? "text-sky-300" : "text-sky-500") : onDark ? "text-wing-elevated/60" : "text-wing-subtle")} aria-label={read ? "seen" : "sent"} />;
}

/** The quoted card/message shown above a reply bubble. */
export function ReplyQuote({ r, mine }: { r: NonNullable<WallMessage["replyTo"]>; mine: boolean }) {
  return (
    <div className={cn("rounded-lg px-2 py-1 mb-1 border-s-4 text-[11px] leading-snug", mine ? "bg-white/15 border-wing-honey" : "bg-wing-elevated border-wing-heat")}>
      <p className={cn("font-bold", mine ? "text-wing-honey" : "text-wing-heat")}>{r.author}</p>
      <p className={cn("line-clamp-2", mine ? "text-wing-elevated/80" : "text-wing-muted")}>{r.preview}</p>
    </div>
  );
}

/**
 * The client's side of the dietitian chat, shown at the top of their feed:
 * live, height-limited with its own scrollbar so it never pushes the feed far
 * down, and it marks the conversation as read while it is on screen.
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
  limit = 40,
  maxAgeDays = 60,
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
  const msgs = useThreadMessages(readWingIds, myId, otherId, limit, maxAgeDays);
  const otherReadAt = useOtherReadAt(readWingIds, myId, otherId);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Stay at the newest message, and mark the conversation read while it's visible.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    if (msgs && msgs.length > 0 && document.visibilityState === "visible") markChatRead(myId, otherId, writeWingId);
  }, [msgs, myId, otherId, writeWingId]);

  async function send() {
    const body = text.trim();
    if (!body || !writeWingId || sending) return;
    setSending(true);
    try {
      const msg = { wingId: writeWingId, targetUserId: otherId, authorId: myId, authorName: myName, text: body };
      await addWallMessage(writeWingId, msg);
      postAuthed("/api/notifications/wall-message", { ...msg, message: body }).catch(() => {});
      setText("");
    } finally {
      setSending(false);
    }
  }

  const when = (m: WallMessage) => (m.createdAt?.toDate ? m.createdAt.toDate() : new Date());

  return (
    <div className="bg-wing-elevated border-2 border-wing-honey/40 rounded-[20px] p-3 space-y-2">
      <div className="flex items-center gap-2 px-1">
        <Stethoscope size={16} className="text-wing-heat" />
        <p className="text-xs font-bold text-wing-heat">{title ?? (he ? `שיחה עם ${otherName}` : `Chat with ${otherName}`)}</p>
      </div>

      <div ref={scrollRef} className="max-h-72 overflow-y-auto space-y-1.5 px-1 py-1 overscroll-contain">
        {msgs && msgs.length === 0 && (
          <p className="text-xs text-wing-muted text-center py-3">{he ? "אפשר לכתוב כאן ישירות לדיאטנית" : "You can write to your dietitian here"}</p>
        )}
        {msgs?.map((m, i) => {
          const mine = m.authorId === myId;
          const d = when(m);
          const prev = i > 0 ? when(msgs[i - 1]) : null;
          return (
            <div key={m.id}>
              {(!prev || prev.toDateString() !== d.toDateString()) && (
                <p className="text-center my-2"><span className="text-[10px] font-semibold text-wing-muted bg-wing-surface border border-wing-border rounded-full px-2.5 py-0.5">{dayLabel(d, he)}</span></p>
              )}
              <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[85%] rounded-2xl px-3 py-2 text-sm", mine ? "bg-wing-ink text-wing-elevated" : "bg-wing-surface border border-wing-border text-wing-ink")}>
                  {m.replyTo && <ReplyQuote r={m.replyTo} mine={mine} />}
                  <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>
                  <p className={cn("text-[10px] mt-0.5 tabular", mine ? "text-wing-elevated/60" : "text-wing-subtle")}>{format(d, "HH:mm")}{mine && <Ticks read={otherReadAt >= d.getTime()} onDark />}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") send(); }}
          placeholder={he ? "כתבו הודעה..." : "Write a message..."}
          className="flex-1 text-sm border border-wing-border rounded-2xl px-3 py-2.5 bg-wing-surface focus:outline-none focus:ring-2 focus:ring-wing-ink text-wing-ink placeholder:text-wing-subtle"
        />
        <button onClick={send} disabled={!text.trim() || sending} aria-label={he ? "שליחה" : "Send"} className="px-4 py-2.5 rounded-2xl bg-wing-ink text-wing-elevated disabled:opacity-40 active:scale-95 transition-transform">
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
