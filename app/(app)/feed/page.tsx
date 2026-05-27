"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { MessageSquare } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useWing } from "@/hooks/useWing";
import { useLanguage } from "@/lib/i18n";
import {
  createDailyPrompt,
  getTodayPrompt,
  getWingPosts,
} from "@/lib/firebase/firestore";
import { getPromptForDate } from "@/lib/dailyPrompts";
import { DailyPromptCard } from "@/components/feed/DailyPromptCard";
import { CreatePostForm } from "@/components/feed/CreatePostForm";
import { PostCard } from "@/components/feed/PostCard";
import type { DailyPrompt, WingPost } from "@/types";

export default function FeedPage() {
  const { user, firebaseUser } = useAuth();
  const { wing } = useWing(user?.wingId);
  const { t, lang } = useLanguage();

  const [todayPrompt, setTodayPrompt] = useState<DailyPrompt | null>(null);
  const [posts, setPosts] = useState<WingPost[]>([]);
  const [loading, setLoading] = useState(true);

  const today = format(new Date(), "yyyy-MM-dd");

  // Load today's prompt (lazy create) + posts
  useEffect(() => {
    if (!user?.wingId || !firebaseUser) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // Daily prompt: get or lazy-create
        const existing = await getTodayPrompt(user.wingId!, today);
        if (existing) {
          if (!cancelled) setTodayPrompt(existing);
        } else {
          const { question, questionId } = getPromptForDate(new Date(), lang);
          const created = await createDailyPrompt(user.wingId!, today, question, questionId);
          if (!cancelled) setTodayPrompt(created);
        }

        // User posts
        const list = await getWingPosts(user.wingId!, 60);
        if (!cancelled) setPosts(list);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.wingId, firebaseUser, today, lang]);

  if (!firebaseUser || !user) return null;

  return (
    <div className="p-4 space-y-4">
      <div className="pt-4 flex items-center gap-2">
        <MessageSquare size={22} className="text-wing-heat" strokeWidth={2.5} />
        <h1 className="text-2xl font-black text-wing-ink tracking-tight">{t("feed_title") as string}</h1>
      </div>

      {/* Create post form */}
      {user.wingId && (
        <CreatePostForm
          wingId={user.wingId}
          userId={firebaseUser.uid}
          userName={user.displayName}
          userPhotoURL={user.photoURL}
          onPostCreated={(p) => setPosts((prev) => [p, ...prev])}
        />
      )}

      {/* Daily prompt */}
      {todayPrompt && user.wingId && wing && (
        <DailyPromptCard
          prompt={todayPrompt}
          wingId={user.wingId}
          currentUserId={firebaseUser.uid}
          currentUserName={user.displayName}
          members={wing.members}
          onResponseAdded={(next) => setTodayPrompt((p) => p ? { ...p, responses: next } : p)}
          onReactionsChanged={(next) => setTodayPrompt((p) => p ? { ...p, reactions: next } : p)}
        />
      )}

      {/* Posts */}
      {loading && posts.length === 0 && (
        <p className="text-center text-sm text-wing-muted py-12 animate-pulse">
          {t("feed_loading") as string}
        </p>
      )}

      {!loading && posts.length === 0 && (
        <p className="text-center text-sm text-wing-muted py-8">
          {t("feed_empty") as string}
        </p>
      )}

      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          wingId={user.wingId!}
          currentUserId={firebaseUser.uid}
          currentUserName={user.displayName}
          onUpdate={(next) => setPosts((prev) => prev.map((p) => p.id === next.id ? next : p))}
          onDelete={(id) => setPosts((prev) => prev.filter((p) => p.id !== id))}
        />
      ))}
    </div>
  );
}
