"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { signUp } from "@/lib/firebase/auth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/dashboard";

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("הסיסמה חייבת להכיל לפחות 6 תווים");
      return;
    }
    setLoading(true);
    try {
      await signUp(email, password, displayName);
      toast.success(`ברוך הבא ${displayName}! 🎉`);
      router.replace(redirectTo);
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("email-already-in-use")) {
        toast.error("אימייל זה כבר קיים במערכת");
      } else {
        toast.error("ההרשמה נכשלה, נסה שוב");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-wing-bg flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <div className="text-6xl">🪽</div>
          <h1 className="text-2xl font-bold text-slate-800">הצטרף למבנה</h1>
          <p className="text-slate-500 text-sm">צור חשבון ותתחיל את המסע</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-card p-6 space-y-4">
          <Input
            label="שם מלא"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="ישראל ישראלי"
            required
          />
          <Input
            label="אימייל"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            dir="ltr"
          />
          <Input
            label="סיסמה"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="לפחות 6 תווים"
            required
            dir="ltr"
          />
          <Button type="submit" loading={loading} size="lg" className="w-full mt-2">
            צור חשבון
          </Button>
        </form>

        <p className="text-center text-sm text-slate-500">
          כבר יש לך חשבון?{" "}
          <Link
            href={redirectTo !== "/dashboard" ? `/login?redirect=${encodeURIComponent(redirectTo)}` : "/login"}
            className="text-wing-primary font-medium hover:underline"
          >
            התחבר
          </Link>
        </p>
      </div>
    </div>
  );
}
