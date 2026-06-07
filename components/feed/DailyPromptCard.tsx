"use client";

import { useState } from "react";
import { Send, Sparkles, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Reactions } from "@/components/ui/Reactions";
import { addPromptResponse, deletePromptResponse, togglePromptReaction } from "@/lib/firebase/firestore";
import { useLanguage } from "@/lib/i18n";
import type { DailyPrompt, PromptResponse, Reaction, ReactionType, WingMember } from "@/types";

interface DailyPromptCardProps {
  prompt: DailyPrompt;
  wingId: string;
  currentUserId: string;
  currentUserName: string;
  members?: WingMember[];
  isViewerAdmin?: boolean;
  onResponseAdded?: (next: PromptResponse[]) => void;
  onResponseDeleted?: (next: PromptResponse[]) => void;
  onReactionsChanged?: (next: Reaction[]) => void;
}

export function DailyPromptCard({
  prompt,
  wingId,
  currentUserId,
  currentUserName,
  members = [],
  isViewerAdmin = false,
  onResponseAdded,
  onResponseDeleted,
  onReactionsChanged,
}: DailyPromptCardProps) {
  const { t } = useLanguage();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [confirmDeleteIdx, setConfirmDeleteIdx] = useState<number | null>(null);

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

  async function handleDeleteResponse(response: PromptResponse, idx: number) {
    await deletePromptResponse(wingId, prompt.date, response);
    const next = responses.filter((_, i) => i !== idx);
    onResponseDeleted?.(next);
    setConfirmDeleteIdx(null);
  }

  async function handleReaction(type: ReactionType) {
    const next = await togglePromptReaction(wingId, prompt.id, prompt.reactions, currentUserId, currentUserName, type);
    onReactionsChanged?.(next);
  }

  return (
    <div className="bg-wing-surface border border-wing-border rounded-[20px] p-4 space-y-3">
      {/* Header — looks like a post header, but with a Wingpact "system" identity */}
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm"
          style={{ background: "linear-gradient(135deg, #f5dd4b, #ff6b47)" }}
        >
          <Sparkles size={18} className="text-wing-ink" strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-bold text-wing-ink leading-tight">Wingpact</p>
            <span className="font-mono text-[9px] tracking-[0.16em] uppercase text-wing-heat bg-wing-elevated border border-wing-border rounded-full px-1.5 py-0.5 font-bold">
              {t("feed_prompt_system_badge") as string}
            </span>
          </div>
          <p className="font-mono text-[10px] tracking-[0.16em] uppercase text-wing-muted mt-0.5">
            {t("feed_prompt_label") as string}
          </p>
        </div>
      </div>

      {/* Question */}
      <p className="text-[16px] font-bold text-wing-ink leading-snug">
        {prompt.question}
      </p>

      {/* Reactions */}
      <Reactions
        reactions={prompt.reactions ?? []}
        currentUserId={currentUserId}
        onToggle={handleReaction}
      />

      {/* Responses */}
      {responses.length > 0 && (
        <div className="space-y-1.5 pt-1">
          {responses.map((r, i) => {
            const photo = memberMap[r.userId]?.photoURL;
            const isMine = r.userId === currentUserId;
            const canDelete = isMine || isViewerAdmin;
            return (
              <div key={i} className="flex items-start gap-2.5 bg-wing-elevated rounded-[12px] px-3 py-2">
                <Avatar name={r.userName} photoURL={photo} size={26} isCurrentUser={isMine} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-wing-ink">{r.userName.split(" ")[0]}</p>
                  <p className="text-sm text-wing-ink/85 leading-snug mt-0.5">{r.text}</p>
                </div>
                {canDelete && (
                  confirmDeleteIdx === i ? (
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => handleDeleteResponse(r, i)}
                        className="text-[10px] font-bold text-red-500 px-2 py-1 rounded-lg bg-red-50 active:scale-95"
                      >
                        {t("post_yes_delete") as string}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteIdx(null)}
                        className="text-[10px] text-wing-muted px-2 py-1 rounded-lg bg-wing-elevated active:scale-95"
                      >
                        {t("cancel") as string}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteIdx(i)}
                      className="shrink-0 p-1 rounded-lg text-wing-subtle hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Response input — only if user hasn't responded yet */}
      {!myResponse && (
        <div className="flex gap-2 items-center bg-wing-elevated rounded-[14px] p-1.5">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
            placeholder={t("feed_prompt_input_ph") as string}
            className="flex-1 bg-transparent text-sm text-wing-ink placeholder:text-wing-subtle px-2 py-1.5 focus:outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className="w-8 h-8 rounded-full bg-wing-ink flex items-center justify-center disabled:opacity-40 active:scale-90 transition-transform shrink-0"
            aria-label="send"
          >
            <Send size={13} className="text-wing-elevated" strokeWidth={2.5} />
          </button>
        </div>
      )}
    </div>
  );
}
