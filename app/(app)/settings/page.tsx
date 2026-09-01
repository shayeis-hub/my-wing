"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useWing } from "@/hooks/useWing";
import { useLanguage } from "@/lib/i18n";
import { isNativeApp } from "@/lib/platform";
import { Switch } from "@/components/ui/Switch";
import { Avatar } from "@/components/ui/Avatar";
import { updateNotificationPrefs } from "@/lib/firebase/firestore";
import type { NotificationPrefs } from "@/types";
import { Languages, Bell, Crown, ChevronLeft, ChevronRight, Users, UserPlus, BookOpen } from "lucide-react";
import toast from "react-hot-toast";

type PrefKey = "reminders" | "personal" | "feed" | "meals";

export default function SettingsPage() {
  const { user, firebaseUser } = useAuth();
  const { wing } = useWing(user?.wingId);
  const { lang, setLang, dir } = useLanguage();
  const isHe = lang === "he";
  const isBusiness = user?.accountType === "business";

  // Missing pref = opted in. Start from the stored prefs, defaulting each to true.
  const stored = user?.notificationPrefs ?? {};
  const [prefs, setPrefs] = useState<Record<PrefKey, boolean>>({
    reminders: stored.reminders !== false,
    personal: stored.personal !== false,
    feed: stored.feed !== false,
    meals: stored.meals !== false,
  });
  // Author uids muted for meal notifications.
  const [mealsMuted, setMealsMuted] = useState<string[]>(stored.mealsMuted ?? []);

  const [appVersion, setAppVersion] = useState<{ version: string; build: string } | null>(null);
  useEffect(() => {
    if (!isNativeApp()) return;
    import("@capacitor/app").then(({ App }) => {
      App.getInfo().then((info) => setAppVersion({ version: info.version, build: info.build }));
    });
  }, []);

  async function persist(nextPrefs: Record<PrefKey, boolean>, nextMuted: string[]) {
    if (!firebaseUser) return;
    const payload: NotificationPrefs = { ...nextPrefs, mealsMuted: nextMuted };
    try {
      await updateNotificationPrefs(firebaseUser.uid, payload);
    } catch {
      // Revert both on failure.
      setPrefs(prefs);
      setMealsMuted(mealsMuted);
      toast.error(isHe ? "לא הצליח לשמור" : "Failed to save");
    }
  }

  function toggle(key: PrefKey) {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next); // optimistic
    persist(next, mealsMuted);
  }

  function toggleMember(uid: string) {
    const next = mealsMuted.includes(uid)
      ? mealsMuted.filter((id) => id !== uid)
      : [...mealsMuted, uid];
    setMealsMuted(next); // optimistic
    persist(prefs, next);
  }

  // Book mode hides the feed entirely (see BottomNav) — the "new feed post"
  // notification toggle would be dead/confusing there, so it's dropped from
  // the list rather than just left unreachable.
  const notifItems: { key: PrefKey; title: string; desc: string }[] = [
    {
      key: "reminders",
      title: isHe ? "תזכורות יומיות" : "Daily reminders",
      desc: isHe ? "תזכורת לבצע צ'ק-אין אם עוד לא רשמת היום" : "A nudge to check in if you haven't logged today",
    },
    {
      key: "personal",
      title: isHe ? "הודעה אישית אליי" : "Personal messages",
      desc: isHe ? "כשמישהו כותב לך על הקיר או מעודד אותך" : "When someone writes on your wall or encourages you",
    },
    ...(user?.bookAccess?.active
      ? []
      : [
          {
            key: "feed" as PrefKey,
            title: isHe ? "פוסט חדש בפיד" : "New feed post",
            desc: isHe ? "כשחבר במבנה מפרסם משהו בפיד" : "When a wing member posts to the feed",
          },
        ]),
    {
      key: "meals",
      title: isHe ? "ארוחה במבנה" : "Meal logged",
      desc: isHe ? "כשחבר מזין ארוחה — הזדמנות לפרגן" : "When a member logs a meal — a chance to cheer them on",
    },
  ];

  const members = (wing?.members ?? []).filter((m) => m.uid !== firebaseUser?.uid);
  const ChevronEnd = isHe ? ChevronLeft : ChevronRight;

  return (
    <div className="p-4 space-y-5" dir={dir}>
      {/* Header */}
      <div className="pt-4">
        <h1 className="text-2xl font-black text-wing-ink tracking-tight">
          {isHe ? "הגדרות" : "Settings"}
        </h1>
      </div>

      {/* Language */}
      <section className="bg-wing-surface border border-wing-border rounded-[20px] p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Languages size={18} className="text-wing-muted" />
          <span className="font-bold text-wing-ink">{isHe ? "שפה" : "Language"}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setLang("he")}
            className={`flex-1 py-2.5 rounded-[14px] text-sm font-bold transition-all ${
              lang === "he" ? "text-wing-ink" : "bg-wing-elevated border border-wing-border text-wing-muted"
            }`}
            style={lang === "he" ? { background: "linear-gradient(135deg, #f5dd4b, #ff6b47)" } : {}}
          >
            עברית
          </button>
          <button
            onClick={() => setLang("en")}
            className={`flex-1 py-2.5 rounded-[14px] text-sm font-bold transition-all ${
              lang === "en" ? "text-wing-ink" : "bg-wing-elevated border border-wing-border text-wing-muted"
            }`}
            style={lang === "en" ? { background: "linear-gradient(135deg, #f5dd4b, #ff6b47)" } : {}}
          >
            English
          </button>
        </div>
      </section>

      {/* Notifications */}
      <section className="bg-wing-surface border border-wing-border rounded-[20px] p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Bell size={18} className="text-wing-muted" />
          <span className="font-bold text-wing-ink">{isHe ? "התראות" : "Notifications"}</span>
        </div>
        <div className="space-y-4">
          {notifItems.map((item) => (
            <div key={item.key}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-wing-ink">{item.title}</p>
                  <p className="text-xs text-wing-muted mt-0.5 leading-snug">{item.desc}</p>
                </div>
                <Switch checked={prefs[item.key]} onChange={() => toggle(item.key)} label={item.title} />
              </div>

              {/* Per-member sub-selection for meal notifications */}
              {item.key === "meals" && prefs.meals && members.length > 0 && (
                <div className="mt-3 rounded-[14px] bg-wing-elevated border border-wing-border p-3 space-y-2.5">
                  <div className="flex items-center gap-1.5">
                    <Users size={13} className="text-wing-muted" />
                    <span className="text-xs font-semibold text-wing-muted">
                      {isHe ? "קבל התראות מ:" : "Receive from:"}
                    </span>
                  </div>
                  {members.map((m) => (
                    <div key={m.uid} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar name={m.displayName} photoURL={m.photoURL} size={28} />
                        <span className="text-sm text-wing-ink truncate">{m.displayName}</span>
                      </div>
                      <Switch
                        checked={!mealsMuted.includes(m.uid)}
                        onChange={() => toggleMember(m.uid)}
                        label={m.displayName}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Wing — surfaces "invite people" prominently for anyone still alone
          in their wing (most likely someone who skipped it during onboarding). */}
      {!isBusiness && user?.wingId && (
        <section className="bg-wing-surface border border-wing-border rounded-[20px] overflow-hidden">
          <Link
            href="/wing"
            className="flex items-center gap-3 p-5 hover:bg-wing-elevated transition-colors"
          >
            <UserPlus size={18} className="text-wing-heat" />
            <div className="flex-1">
              <p className="font-bold text-wing-ink">
                {members.length === 0
                  ? (isHe ? "אתה לבד במבנה שלך" : "You're alone in your wing")
                  : (isHe ? "המבנה שלי" : "My wing")}
              </p>
              {members.length === 0 && (
                <p className="text-xs text-wing-muted mt-0.5">
                  {isHe ? "הזמינו חברים כדי להתחיל לעודד אחד את השני" : "Invite people to start cheering each other on"}
                  {user?.bookAccess?.active &&
                    (isHe
                      ? " — אפשר להזמין עד 2 חברים שיצטרפו אליך ללא עלות נוספת."
                      : " — you can invite up to 2 friends to join you at no extra cost.")}
                </p>
              )}
            </div>
            <ChevronEnd size={18} className="text-wing-muted" />
          </Link>
        </section>
      )}

      {/* Book code — only for users not already in book mode (existing
          Wingpact users don't go through onboarding, so this is their only
          way to redeem a code bought after they already had an account). */}
      {!isBusiness && !user?.bookAccess?.active && (
        <section className="bg-wing-surface border border-wing-border rounded-[20px] overflow-hidden">
          <Link
            href="/book/redeem"
            className="flex items-center gap-3 p-5 hover:bg-wing-elevated transition-colors"
          >
            <BookOpen size={18} className="text-wing-heat" />
            <span className="flex-1 font-bold text-wing-ink">
              {isHe ? "יש לי קוד מהספר" : "I have a code from the book"}
            </span>
            <ChevronEnd size={18} className="text-wing-muted" />
          </Link>
        </section>
      )}

      {/* Subscription */}
      <section className="bg-wing-surface border border-wing-border rounded-[20px] overflow-hidden">
        <Link
          href={isBusiness ? "/coach" : "/subscription"}
          className="flex items-center gap-3 p-5 hover:bg-wing-elevated transition-colors"
        >
          <Crown size={18} className="text-yellow-500" />
          <span className="flex-1 font-bold text-wing-ink">
            {isBusiness ? (isHe ? "ניהול מנוי עסקי" : "Business plan") : (isHe ? "ניהול מנוי" : "Manage subscription")}
          </span>
          <ChevronEnd size={18} className="text-wing-muted" />
        </Link>
      </section>

      {appVersion && (
        <p className="text-center text-xs text-wing-subtle pt-1">
          {isHe
            ? `גרסה ${appVersion.version} (${appVersion.build})`
            : `Version ${appVersion.version} (${appVersion.build})`}
        </p>
      )}
    </div>
  );
}
