"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/lib/i18n";
import toast from "react-hot-toast";

export default function BookRedeemPage() {
  const { firebaseUser } = useAuth();
  const router = useRouter();
  const { lang, dir } = useLanguage();
  const he = lang === "he";
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRedeem() {
    if (!firebaseUser || !code.trim()) return;
    setLoading(true);
    try {
      const token = await firebaseUser.getIdToken();
      const res = await fetch("/api/book/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(
          data?.error === "Invalid code"
            ? he ? "הקוד לא נכון - בדקו בספר ונסו שוב" : "That code isn't right — check the book and try again"
            : he ? "משהו השתבש, נסו שוב" : "Something went wrong, please try again"
        );
        return;
      }
      toast.success(he ? "ברוכים הבאים - מתחילים בהרגל הראשון" : "Welcome — let's start with habit one");
      router.replace("/dashboard"); // AuthGuard picks up bookAccess and routes into book onboarding
    } catch {
      toast.error(he ? "משהו השתבש, נסו שוב" : "Something went wrong, please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-wing-bg flex flex-col items-center justify-center p-5" dir={dir}>
      <div className="w-full max-w-[340px]">
        <button onClick={() => router.back()} className="p-2 -ms-2 mb-4 hover:bg-wing-elevated rounded-xl">
          <ArrowLeft size={20} className={`text-wing-muted ${he ? "rotate-180" : ""}`} />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-wing-elevated border border-wing-border flex items-center justify-center mb-4">
          <BookOpen size={22} className="text-wing-heat" />
        </div>

        <h1 className="text-2xl font-black text-wing-ink tracking-tight mb-2">
          {he ? "הזינו את קוד הספר" : "Enter your book code"}
        </h1>
        <p className="text-sm text-wing-muted leading-relaxed mb-6">
          {he
            ? "תמצאו אותו בסוף הספר \"הרגל אחד בכל פעם\". הקוד פותח את מעקב ההרגלים שנבנה בשביל הספר."
            : "Find it near the end of \"One Habit at a Time.\" This unlocks the habit tracker built for the book."}
        </p>

        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={he ? "הקוד שלכם" : "Your code"}
          dir="ltr"
          className="w-full bg-wing-surface border border-wing-border rounded-xl px-4 py-3 text-sm font-mono tracking-wide text-wing-ink placeholder:text-wing-subtle focus:outline-none focus:ring-2 focus:ring-wing-ink mb-4"
        />

        <Button className="w-full" onClick={handleRedeem} disabled={!code.trim()} loading={loading}>
          {he ? "פתיחה" : "Unlock"}
        </Button>
      </div>
    </div>
  );
}
