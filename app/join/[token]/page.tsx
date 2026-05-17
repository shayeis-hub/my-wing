"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export default function JoinPage() {
  const { token } = useParams<{ token: string }>();
  const { firebaseUser, user, loading } = useAuth();
  const router = useRouter();
  const [joining, setJoining] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && firebaseUser && user?.wingId) {
      router.replace("/wing");
    }
  }, [loading, firebaseUser, user, router]);

  async function handleJoin() {
    if (!firebaseUser || !user) {
      router.push(`/login?redirect=/join/${token}`);
      return;
    }
    setJoining(true);
    try {
      const res = await fetch("/api/wing/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          userId: firebaseUser.uid,
          displayName: user.displayName,
          photoURL: user.photoURL,
        }),
      });
      if (!res.ok) throw new Error();
      setDone(true);
      setTimeout(() => router.replace("/dashboard"), 2000);
    } catch {
      setError("קישור לא תקין או שפג תוקפו.");
    } finally {
      setJoining(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-wing-bg flex items-center justify-center">
        <div className="text-4xl animate-bounce">🪽</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-wing-bg flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="text-6xl">🪽</div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">הצטרף למבנה כנף</h1>
          <p className="text-slate-500 text-sm mt-2">
            קיבלת הזמנה להצטרף לקבוצת תמיכה לירידה במשקל
          </p>
        </div>

        {done ? (
          <div className="bg-green-50 text-green-600 rounded-3xl p-6">
            <div className="text-4xl mb-2">🎉</div>
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
        ) : !firebaseUser ? (
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
        ) : (
          <Button size="lg" className="w-full" onClick={handleJoin} loading={joining}>
            הצטרף למבנה 🪽
          </Button>
        )}
      </div>
    </div>
  );
}
