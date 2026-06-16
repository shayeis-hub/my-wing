"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
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
        if (data?.error === "COACH_LIMIT_REACHED") {
          setError("הדיאטנ/ית הגיעה למגבלת הלקוחות — פנה/י אליה ישירות.");
          return;
        }
        if (data?.error === "Coach plan inactive") {
          setError("המסלול של הדיאטנ/ית אינו פעיל כרגע — פנה/י אליה ישירות.");
          return;
        }
        throw new Error(data?.error ?? "join failed");
      }
      setDone(true);
      setTimeout(() => router.replace("/dashboard"), 1500);
    } catch (err) {
      console.error("Join error:", err);
      setError("קישור לא תקין או שפג תוקפו.");
    } finally {
      setJoining(false);
    }
  }

  if (loading || (firebaseUser && user && !done && !error)) {
    return (
      <div className="min-h-screen bg-wing-bg flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="flex justify-center animate-bounce"><WingLogo /></div>
          <p className="text-sm text-wing-muted">מצטרף/ת למבנה...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-wing-bg flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="flex justify-center"><WingLogo /></div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">הצטרף למבנה כנף</h1>
          <p className="text-slate-500 text-sm mt-2">
            קיבלת הזמנה להצטרף לקבוצת תמיכה לירידה במשקל
          </p>
        </div>

        {done ? (
          <div className="bg-green-50 text-green-600 rounded-3xl p-6">
            <p className="font-bold">הצטרפת בהצלחה!</p>
            <p className="text-sm mt-1">מעביר אותך לדשבורד...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-500 rounded-3xl p-6">
            <p className="font-medium">{error}</p>
            <Link href="/" className="text-sm underline mt-2 block">
              חזור לדף הבית
            </Link>
          </div>
        ) : (
          // Not logged in — prompt to register or log in
          <div className="space-y-3">
            <p className="text-slate-600 text-sm">
              כדי להצטרף, עליך להתחבר או להירשם תחילה
            </p>
            <Link href={`/login?redirect=/join/${token}`}>
              <Button size="lg" className="w-full">
                התחבר והצטרף
              </Button>
            </Link>
            <Link href={`/register?redirect=/join/${token}`}>
              <Button variant="secondary" size="lg" className="w-full">
                הירשם והצטרף
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
