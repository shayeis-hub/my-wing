"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

function WingLogo() {
  return (
    <svg width="56" height="34" viewBox="0 0 60 36" fill="none">
      <defs>
        <linearGradient id="wl-join" x1="0" y1="0" x2="60" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#f5dd4b" />
          <stop offset="1" stopColor="#ff6b47" />
        </linearGradient>
      </defs>
      <path d="M4 30 L30 8 L56 30" stroke="url(#wl-join)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="30" cy="8" r="3" fill="#d4541a" />
      <circle cx="17" cy="19" r="1.8" fill="#1a1814" />
      <circle cx="43" cy="19" r="1.8" fill="#1a1814" />
    </svg>
  );
}

export default function JoinPage() {
  const { token } = useParams<{ token: string }>();
  const { firebaseUser, user, loading } = useAuth();
  const { lang } = useLanguage();
  const router = useRouter();
  const [joining, setJoining] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  // Auto-join as soon as the user is authenticated
  useEffect(() => {
    if (loading || !firebaseUser || !user) return;
    if (done || joining) return;
    doJoin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, firebaseUser, user]);

  async function doJoin() {
    setJoining(true);
    try {
      const res = await fetch("/api/wing/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          userId: firebaseUser!.uid,
          displayName: user!.displayName,
          photoURL: user!.photoURL,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data?.error === "Already a member") {
          router.replace("/dashboard");
          return;
        }
        if (data?.error === "BOOK_WING_LIMIT_REACHED") {
          setError(lang === "he"
            ? "המבנה הזה כבר מלא — עד 2 חברים בלבד יכולים להצטרף במצב-ספר."
            : "This wing is already full — only 2 friends can join in Book Mode.");
          return;
        }
        if (data?.error === "FIT_DAD_WING_LIMIT_REACHED") {
          setError(lang === "he"
            ? "המבנה הזה כבר מלא — נסה/י לבחור מבנה אחר."
            : "This wing is already full — please pick a different one.");
          return;
        }
        if (data?.error === "COACH_LIMIT_REACHED") {
          setError(lang === "he"
            ? "הדיאטנ/ית הגיעה למגבלת הלקוחות — פנה/י אליה ישירות."
            : "The dietitian has reached their client limit — please contact them directly.");
          return;
        }
        if (data?.error === "Coach plan inactive") {
          setError(lang === "he"
            ? "המסלול של הדיאטנ/ית אינו פעיל כרגע — פנה/י אליה ישירות."
            : "The dietitian's plan isn't active right now — please contact them directly.");
          return;
        }
        throw new Error(data?.error ?? "join failed");
      }
      setDone(true);
      setTimeout(() => router.replace("/dashboard"), 1500);
    } catch (err) {
      console.error("Join error:", err);
      setError(lang === "he" ? "קישור לא תקין או שפג תוקפו." : "This link is invalid or has expired.");
    } finally {
      setJoining(false);
    }
  }

  const dir = lang === "he" ? "rtl" : "ltr";

  if (loading || (firebaseUser && user && !done && !error)) {
    return (
      <div className="min-h-screen bg-wing-bg flex items-center justify-center" dir={dir}>
        <div className="text-center space-y-4">
          <div className="flex justify-center animate-bounce"><WingLogo /></div>
          <p className="text-sm text-wing-muted">{lang === "he" ? "מצטרף/ת למבנה..." : "Joining the wing..."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-wing-bg flex flex-col items-center justify-center p-6" dir={dir}>
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="flex justify-center"><WingLogo /></div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{lang === "he" ? "הצטרף למבנה כנף" : "Join a Wing"}</h1>
          <p className="text-slate-500 text-sm mt-2">
            {lang === "he" ? "קיבלת הזמנה להצטרף לקבוצת תמיכה לירידה במשקל" : "You've been invited to join a weight-loss support group"}
          </p>
        </div>

        {done ? (
          <div className="bg-green-50 text-green-600 rounded-3xl p-6">
            <p className="font-bold">{lang === "he" ? "הצטרפת בהצלחה!" : "Successfully joined!"}</p>
            <p className="text-sm mt-1">{lang === "he" ? "מעביר אותך לדשבורד..." : "Taking you to your dashboard..."}</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-500 rounded-3xl p-6">
            <p className="font-medium">{error}</p>
            <Link href="/" className="text-sm underline mt-2 block">
              {lang === "he" ? "חזור לדף הבית" : "Back to home"}
            </Link>
          </div>
        ) : (
          // Not logged in — prompt to register or log in
          <div className="space-y-3">
            <p className="text-slate-600 text-sm">
              {lang === "he" ? "כדי להצטרף, עליך להתחבר או להירשם תחילה" : "To join, you'll need to log in or sign up first"}
            </p>
            <Link href={`/login?redirect=/join/${token}`}>
              <Button size="lg" className="w-full">
                {lang === "he" ? "התחבר והצטרף" : "Log in & Join"}
              </Button>
            </Link>
            <Link href={`/register?redirect=/join/${token}`}>
              <Button variant="secondary" size="lg" className="w-full">
                {lang === "he" ? "הירשם והצטרף" : "Sign up & Join"}
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
