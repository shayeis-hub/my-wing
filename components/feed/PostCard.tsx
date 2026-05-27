"use client";

import { useState } from "react";
import { Trash2, Send } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Reactions } from "@/components/ui/Reactions";
import {
  togglePostReaction,
  addPostComment,
  deleteWingPost,
} from "@/lib/firebase/firestore";
import { useLanguage } from "@/lib/i18n";
import type { Encouragement, Reaction, ReactionType, WingPost } from "@/types";

interface PostCardProps {
  post: WingPost;
  wingId: string;
  currentUserId: string;
  currentUserName: string;
  onUpdate: (next: WingPost) => void;
  onDelete: (postId: string) => void;
}

export function PostCard({ post, wingId, currentUserId, currentUserName, onUpdate, onDelete }: PostCardProps) {
  const { t } = useLanguage();
  const [commentText, setCommentText] = useState("");
  const [sending, setSending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isOwn = post.userId === currentUserId;
  const comments = post.comments ?? [];

  function formatTime(ts: WingPost["createdAt"]): string {
    const d = ts?.toDate ? ts.toDate() : new Date();
    const diffMs = Date.now() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return t("post_just_now") as string;
    if (diffMin < 60) return (t("post_minutes_ago") as (n: number) => string)(diffMin);
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return (t("post_hours_ago") as (n: number) => string)(diffHr);
    const diffDay = Math.floor(diffHr / 24);
    return (t("post_days_ago") as (n: number) => string)(diffDay);
  }

  async function handleReaction(type: ReactionType) {
    const next: Reaction[] = await togglePostReaction(
      wingId, post.id, post.reactions, currentUserId, currentUserName, type
    );
    onUpdate({ ...post, reactions: next });
  }

  async function handleComment() {
    const trimmed = commentText.trim();
    if (!trimmed || sending) return;
    setSending(true);
    const c: Encouragement = {
      authorId: currentUserId,
      authorName: currentUserName,
      text: trimmed,
      createdAt: Date.now(),
    };
    try {
      await addPostComment(wingId, post.id, c);
      onUpdate({ ...post, comments: [...comments, c] });
      setCommentText("");
    } finally {
      setSending(false);
    }
  }

  async function handleDelete() {
    await deleteWingPost(wingId, post.id);
    onDelete(post.id);
  }

  return (
    <div className="bg-wing-surface border border-wing-border rounded-[20px] p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Avatar name={post.userName} photoURL={post.userPhotoURL} size={40} isCurrentUser={isOwn} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-wing-ink leading-tight">{post.userName}</p>
          <p className="font-mono text-[10px] tracking-[0.16em] uppercase text-wing-muted mt-0.5">
            {formatTime(post.createdAt)}
          </p>
        </div>
        {isOwn && (
          <button
            onClick={() => setConfirmDelete((v) => !v)}
            className="p-1.5 rounded-xl hover:bg-wing-elevated text-wing-muted"
            aria-label="delete"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="bg-red-50 border border-red-200 rounded-[14px] p-3 space-y-2">
          <p className="text-sm font-medium text-red-700 text-center">{t("post_delete_confirm") as string}</p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmDelete(false)}
              className="flex-1 py-2 rounded-[12px] text-sm border border-wing-border text-wing-muted hover:bg-wing-elevated transition-colors"
            >
              {t("post_cancel") as string}
            </button>
            <button
              onClick={handleDelete}
              className="flex-1 py-2 rounded-[12px] text-sm bg-red-500 text-white font-bold hover:bg-red-600 transition-colors"
            >
              {t("post_yes_delete") as string}
            </button>
          </div>
        </div>
      )}

      {/* Text */}
      {post.text && (
        <p className="text-[15px] text-wing-ink leading-relaxed whitespace-pre-wrap">{post.text}</p>
      )}

      {/* Image */}
      {post.imageURL && (
        <div className="rounded-[14px] overflow-hidden -mx-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.imageURL} alt="post" className="w-full max-h-[480px] object-cover" />
        </div>
      )}

      {/* Reactions */}
      {!isOwn && (
        <Reactions
          reactions={post.reactions ?? []}
          currentUserId={currentUserId}
          onToggle={handleReaction}
        />
      )}
      {isOwn && (post.reactions ?? []).length > 0 && (
        <Reactions
          reactions={post.reactions ?? []}
          currentUserId={currentUserId}
          onToggle={async () => { /* own */ }}
        />
      )}

      {/* Comments */}
      {comments.length > 0 && (
        <div className="space-y-1.5 pt-1">
          {comments.map((c, i) => (
            <div key={i} className="bg-wing-elevated rounded-[12px] px-3 py-2">
              <p className="text-xs font-bold text-wing-ink">{c.authorName.split(" ")[0]}</p>
              <p className="text-sm text-wing-ink/85 leading-snug mt-0.5">{c.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* Comment input */}
      <div className="flex gap-2 items-center bg-wing-elevated rounded-[14px] p-1.5">
        <input
          type="text"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleComment(); }}
          placeholder={t("post_comment_ph") as string}
          className="flex-1 bg-transparent text-sm text-wing-ink placeholder:text-wing-subtle px-2 py-1.5 focus:outline-none"
        />
        <button
          onClick={handleComment}
          disabled={!commentText.trim() || sending}
          className="w-8 h-8 rounded-full bg-wing-ink flex items-center justify-center disabled:opacity-40 active:scale-90 transition-transform shrink-0"
          aria-label="send"
        >
          <Send size={13} className="text-wing-elevated" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
