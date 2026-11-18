"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { MessageSquare, Stethoscope } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useWing } from "@/hooks/useWing";
import { useLanguage } from "@/lib/i18n";
import { isWingAdmin } from "@/lib/wing/roles";
import {
  createDailyPrompt,
  getTodayPrompt,
  getWingPosts,
  getWallMessages,
  type WallMessage,
} from "@/lib/firebase/firestore";
import { getPromptForDate } from "@/lib/dailyPrompts";
import { DailyPromptCard } from "@/components/feed/DailyPromptCard";
import { CreatePostForm } from "@/components/feed/CreatePostForm";
import { PostCard } from "@/components/feed/PostCard";
import type { DailyPrompt, WingPost } from "@/types";

const QUOTES_HE = [
  "הגוף מגיע לאן שהמוח מוביל אותו.",
  "אין קיצורי דרך לכל מקום שראוי ללכת אליו.",
  "כל ארוחה היא הזדמנות לטפל בעצמך.",
  "שינוי קטן בכל יום הוא שינוי עצום לאורך שנה.",
  "אכול כדי לחיות, אל תחיה כדי לאכול.",
  "הגוף שלך הוא ההשקעה הכי טובה שיש.",
  "בריאות היא לא יעד — היא דרך חיים.",
  "כל צעד קדימה הוא ניצחון, גם הקטן שבהם.",
  "מה שאתה אוכל בפרטיות, אתה מראה בפומבי.",
  "המוטיבציה מתחילה אותך, ההרגל ממשיך אותך.",
  "הגוף שלך שומע כל מה שאתה אומר לעצמך.",
  "דאג לגוף שלך — זה המקום היחיד שיש לך לגור בו.",
  "הדרך לבריאות מתחילה בצלחת שלך.",
  "לא מדובר בדיאטה — מדובר בחיים טובים יותר.",
  "אתה לא צריך להיות מושלם, רק עקבי.",
  "כל יום שאתה בוחר נכון, אתה מתקרב ליעד.",
  "תזונה טובה היא אהבה עצמית בצלחת.",
  "הגוף שלך עובד קשה עבורך — עבוד קשה עבורו.",
  "שינוי אמיתי לוקח זמן — תן לו זמן.",
  "אל תאכל פחות — אכול נכון.",
  "ירידה במשקל היא תוצאה. בריאות היא המטרה.",
  "מה שנראה כקורבן היום, ייראה כניצחון מחר.",
];

const QUOTES_EN = [
  "Your body hears everything your mind says.",
  "Take care of your body — it's the only place you have to live.",
  "Every meal is a chance to nourish yourself.",
  "Small daily improvements lead to stunning results.",
  "Eat to live, don't live to eat.",
  "Health is not a destination — it's a way of life.",
  "Your body is your most priceless possession.",
  "Every step forward is a victory, no matter how small.",
  "What you eat in private, you wear in public.",
  "Motivation gets you started. Habit keeps you going.",
  "A healthy outside starts from the inside.",
  "Don't eat less — eat right.",
];

function getDailyQuote(quotes: string[]): string {
  const daysSinceEpoch = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  return quotes[Math.floor(daysSinceEpoch / 3) % quotes.length];
}

export default function FeedPage() {
  const { user, firebaseUser } = useAuth();
  const { wing } = useWing(user?.wingId);
  const { t, lang } = useLanguage();

  const [todayPrompt, setTodayPrompt] = useState<DailyPrompt | null>(null);
  const [posts, setPosts] = useState<WingPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [coachMsgs, setCoachMsgs] = useState<WallMessage[]>([]);

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

  // Messages the dietitian wrote to this client's personal wall. The wall itself has no
  // entry point in the client app, so surface the recent ones here.
  useEffect(() => {
    const coachId = user?.coachAccess?.active ? user.coachAccess.coachId : null;
    if (!coachId || !firebaseUser) return;
    const wingIds = [...new Set([user?.coachAccess?.wingId, user?.wingId].filter(Boolean) as string[])];
    let cancelled = false;
    Promise.all(wingIds.map((w) => getWallMessages(w, firebaseUser.uid, 10).catch(() => [] as WallMessage[]))).then((lists) => {
      if (cancelled) return;
      const cutoff = Date.now() - 14 * 86_400_000;
      setCoachMsgs(
        lists.flat()
          .filter((m) => m.authorId === coachId && (m.createdAt?.toMillis?.() ?? 0) > cutoff)
          .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0))
          .slice(0, 3)
      );
    });
    return () => { cancelled = true; };
  }, [user?.coachAccess?.active, user?.coachAccess?.coachId, user?.coachAccess?.wingId, user?.wingId, firebaseUser]);

  if (!firebaseUser || !user) return null;

  return (
    <div className="p-4 space-y-4">
      <div className="pt-4">
        <div className="flex items-center gap-2">
          <MessageSquare size={22} className="text-wing-heat" strokeWidth={2.5} />
          <h1 className="text-2xl font-black text-wing-ink tracking-tight">{t("feed_title") as string}</h1>
        </div>
        <p className="text-base text-wing-ink/70 mt-1.5 leading-relaxed">
          &ldquo;{getDailyQuote(lang === "he" ? QUOTES_HE : QUOTES_EN)}&rdquo;
        </p>
      </div>

      {coachMsgs.map((m) => (
        <div key={m.id} className="bg-wing-elevated border-2 border-wing-honey/40 rounded-[20px] p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <Stethoscope size={16} className="text-wing-heat" />
            <p className="text-xs font-bold text-wing-heat">{lang === "he" ? `הודעה מ${m.authorName}` : `Message from ${m.authorName}`}</p>
            <span className="text-[11px] text-wing-subtle tabular ms-auto">{m.createdAt?.toDate ? format(m.createdAt.toDate(), "d/M HH:mm") : ""}</span>
          </div>
          <p className="text-sm text-wing-ink leading-relaxed">{m.text}</p>
        </div>
      ))}

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
          isViewerAdmin={isWingAdmin(wing, firebaseUser.uid)}
          onResponseAdded={(next) => setTodayPrompt((p) => p ? { ...p, responses: next } : p)}
          onResponseDeleted={(next) => setTodayPrompt((p) => p ? { ...p, responses: next } : p)}
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
          isViewerAdmin={isWingAdmin(wing, firebaseUser.uid)}
          onUpdate={(next) => setPosts((prev) => prev.map((p) => p.id === next.id ? next : p))}
          onDelete={(id) => setPosts((prev) => prev.filter((p) => p.id !== id))}
        />
      ))}
    </div>
  );
}
