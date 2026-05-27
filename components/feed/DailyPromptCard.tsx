"use client";

import { useState } from "react";
import { MessageCircle, Send } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Reactions } from "@/components/ui/Reactions";
import { addPromptResponse, togglePromptReaction } from "@/lib/firebase/firestore";
import { useLanguage } from "@/lib/i18n";
import type { DailyPrompt, PromptResponse, Reaction, ReactionType, WingMember } from "@/types";

interface DailyPromptCardProps {
  prompt: DailyPrompt;
  wingId: string;
  currentUserId: string;
  currentUserName: string;
  members?: WingMember[];
  onResponseAdded?: (next: PromptResponse[]) => void;
  onReactionsChanged?: (next: Reaction[]) => void;
}

export function DailyPromptCard({
  prompt,
  wingId,
  currentUserId,
  currentUserName,
  members = [],
  onResponseAdded,
  onReactionsChanged,
}: DailyPromptCardProps) {
  const { t } = useLanguage();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const responses = prompt.responses ?? [];
  const memberMap = Object.fromEntries(members.map((m) => [m.uid, m]));
  const myResponse = responses.find((r) => r.userId === currentUserId);

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    const resp: PromptResponse = {
      userId: currentUserId,
      userName: currentUserName,
      text: trimmed,
      createdAt: Date.now(),
    };
    try {
      await addPromptResponse(wingId, prompt.date, resp);
      onResponseAdded?.([...responses, resp]);
      setText("");
    } finally {
      setSending(false);
    }
  }

  async function handleReaction(type: ReactionType) {
    const next = await togglePromptReaction(wingId, prompt.id, prompt.reactions, currentUserId, currentUserName, type);
    onReactionsChanged?.(next);
  }

  return (
    <div
      className="rounded-[20px] p-5 space-y-4"
      style={{ background: "linear-gradient(135deg, #fff3b8, #ffc89a)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-2xl bg-white/40 flex items-center justify-center">
          <MessageCircle size={16} className="text-[#c79a00]" strokeWidth={2.5} />
        </div>
        <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-[#a07a00] font-bold">
          {t("feed_prompt_label") as string}
        </span>
      </div>

      {/* Question */}
      <p className="font-black text-wing-ink text-lg leading-tight">
        {prompt.question}
      </p>

      {/* Reactions */}
      <Reactions
        reactions={prompt.reactions ?? []}
        currentUserId={currentUserId}
        onToggle={handleReaction}
        size="md"
      />

      {/* Responses */}
      {responses.length > 0 && (
        <div className="space-y-2 pt-1">
          {responses.map((r, i) => {
            const photo = memberMap[r.userId]?.photoURL;
            const isMine = r.userId === currentUserId;
            return (
              <div
                key={i}
                className="flex items-start gap-2.5 bg-white/60 rounded-[14px] px-3 py-2.5"
              >
                <Avatar name={r.userName} photoURL={photo} size={28} isCurrentUser={isMine} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-wing-ink">{r.userName.split(" ")[0]}</p>
                  <p className="text-sm text-wing-ink/85 leading-snug mt-0.5">{r.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Response input — only if user hasn't responded yet */}
      {!myResponse && (
        <div className="flex gap-2 items-center bg-white/60 rounded-[14px] p-1.5">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
            placeholder={t("feed_prompt_input_ph") as string}
            className="flex-1 bg-transparent text-sm text-wing-ink placeholder:text-wing-ink/50 px-2 py-2 focus:outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className="w-9 h-9 rounded-full bg-wing-ink flex items-center justify-center disabled:opacity-40 active:scale-90 transition-transform shrink-0"
            aria-label="send"
          >
            <Send size={14} className="text-wing-elevated" strokeWidth={2.5} />
          </button>
        </div>
      )}
    </div>
  );
}
