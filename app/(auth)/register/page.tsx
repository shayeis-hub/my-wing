"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { signUp, signInWithGoogle } from "@/lib/firebase/auth";

function WingLogo() {
  return (
    <svg width="56" height="34" viewBox="0 0 60 36" fill="none">
      <defs>
        <linearGradient id="wl-register" x1="0" y1="0" x2="60" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#f5dd4b" />
          <stop offset="1" stopColor="#ff6b47" />
        </linearGradient>
      </defs>
      <path d="M4 30 L30 8 L56 30" stroke="url(#wl-register)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="30" cy="8" r="3" fill="#d4541a" />
      <circle cx="17" cy="19" r="1.8" fill="#1a1814" />
      <circle cx="43" cy="19" r="1.8" fill="#1a1814" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/onboarding";

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) { toast.error("הסיסמה חייבת להכיל לפחות 6 תווים"); return; }
    setLoading(true);
    try {
      await signUp(email, password, displayName);
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

  async function handleGoogle() {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      router.replace(redirectTo);
    } catch {
      toast.error("ההתחברות עם Google נכשלה");
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <div className="w-full max-w-[340px] flex flex-col items-center">
      {/* Logo */}
      <div className="flex flex-col items-center gap-3 mb-8">
        <WingLogo />
        <div className="text-center">
          <h1 className="text-[30px] font-black text-wing-ink tracking-[-0.025em]">הצטרף למבנה</h1>
          <p className="text-sm text-wing-muted mt-1">צור חשבון ותתחיל את המסע</p>
        </div>
      </div>

      {/* Google first */}
      <button
        onClick={handleGoogle}
        disabled={googleLoading}
        className="w-full bg-wing-surface border border-wing-border rounded-[14px] px-4 py-3.5 text-sm font-semibold text-wing-ink flex items-center justify-center gap-2 active:scale-[0.97] transition-transform disabled:opacity-60 mb-4"
      >
        <GoogleIcon />
        {googleLoading ? "מתחבר..." : "הרשמה עם Google"}
      </button>

      {/* Divider */}
      <div className="flex items-center gap-2 w-full mb-4">
        <div className="flex-1 h-px bg-wing-border" />
        <span className="font-mono text-xs tracking-[0.22em] uppercase text-wing-muted">או עם אימייל</span>
        <div className="flex-1 h-px bg-wing-border" />
      </div>

      {/* Fields */}
      <form onSubmit={handleSubmit} className="w-full flex flex-col gap-2.5">
        <input
          type="text"
          placeholder="שם מלא"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
          className="w-full bg-wing-surface border border-wing-border rounded-[14px] px-4 py-3.5 text-sm text-wing-ink placeholder:text-wing-subtle focus:outline-none focus:ring-2 focus:ring-wing-ink transition-all"
        />
        <input
          type="email"
          placeholder="אימייל"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          dir="ltr"
          className="w-full bg-wing-surface border border-wing-border rounded-[14px] px-4 py-3.5 text-sm text-wing-ink placeholder:text-wing-subtle focus:outline-none focus:ring-2 focus:ring-wing-ink transition-all"
        />
        <input
          type="password"
          placeholder="סיסמה (לפחות 6 תווים)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          dir="ltr"
          className="w-full bg-wing-surface border border-wing-border rounded-[14px] px-4 py-3.5 text-sm text-wing-ink placeholder:text-wing-subtle focus:outline-none focus:ring-2 focus:ring-wing-ink transition-all"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-sunrise text-wing-ink font-extrabold text-sm py-3.5 rounded-[14px] mt-1 active:scale-[0.97] transition-transform disabled:opacity-60"
        >
          {loading ? "יוצר חשבון..." : "צור חשבון"}
        </button>
      </form>

      <p className="text-center text-xs text-wing-muted mt-6">
        כבר יש לך חשבון?{" "}
        <Link href="/login" className="text-wing-heat font-bold">
          התחבר
        </Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-wing-bg flex flex-col items-center justify-center p-6">
      <Suspense fallback={<WingLogo />}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
