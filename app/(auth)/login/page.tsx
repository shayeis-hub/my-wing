"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { signIn, signInWithGoogle } from "@/lib/firebase/auth";
import { useLanguage } from "@/lib/i18n";

function WingLogo() {
  return (
    <svg width="56" height="34" viewBox="0 0 60 36" fill="none">
      <defs>
        <linearGradient id="wl-login" x1="0" y1="0" x2="60" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#f5dd4b" />
          <stop offset="1" stopColor="#ff6b47" />
        </linearGradient>
      </defs>
      <path d="M4 30 L30 8 L56 30" stroke="url(#wl-login)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
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

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/dashboard";
  const { t, lang, setLang, dir } = useLanguage();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(email, password);
      router.replace(redirectTo);
    } catch {
      toast.error(t("login_error"));
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
      toast.error(t("login_google_error"));
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <div className="w-full max-w-[340px] flex flex-col items-center" dir={dir}>
      {/* Language switcher */}
      <div className="flex gap-1.5 self-end mb-6">
        <button
          onClick={() => setLang("he")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            lang === "he"
              ? "bg-wing-ink text-wing-elevated"
              : "bg-wing-elevated border border-wing-border text-wing-muted"
          }`}
        >
          עב
        </button>
        <button
          onClick={() => setLang("en")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            lang === "en"
              ? "bg-wing-ink text-wing-elevated"
              : "bg-wing-elevated border border-wing-border text-wing-muted"
          }`}
        >
          EN
        </button>
      </div>

      {/* Logo */}
      <div className="flex flex-col items-center gap-3 mb-10">
        <WingLogo />
        <div className="text-center">
          <h1 className="text-[30px] font-black text-wing-ink tracking-[-0.025em]">{t("app_name")}</h1>
          <p className="text-sm text-wing-muted mt-1">{t("app_tagline")}</p>
        </div>
      </div>

      {/* Fields */}
      <form onSubmit={handleSubmit} className="w-full flex flex-col gap-2.5">
        <input
          type="email"
          placeholder={t("login_email")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          dir="ltr"
          className="w-full bg-wing-surface border border-wing-border rounded-[14px] px-4 py-3.5 text-sm text-wing-ink placeholder:text-wing-subtle focus:outline-none focus:ring-2 focus:ring-wing-ink transition-all"
        />
        <input
          type="password"
          placeholder={t("login_password")}
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
          {loading ? t("login_submitting") : t("login_submit")}
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-2 w-full my-5">
        <div className="flex-1 h-px bg-wing-border" />
        <span className="font-mono text-xs tracking-[0.22em] uppercase text-wing-muted">{t("or")}</span>
        <div className="flex-1 h-px bg-wing-border" />
      </div>

      {/* Google */}
      <button
        onClick={handleGoogle}
        disabled={googleLoading}
        className="w-full bg-wing-surface border border-wing-border rounded-[14px] px-4 py-3.5 text-sm font-semibold text-wing-ink flex items-center justify-center gap-2 active:scale-[0.97] transition-transform disabled:opacity-60"
      >
        <GoogleIcon />
        {t("login_google")}
      </button>

      {/* Register link */}
      <p className="text-center text-xs text-wing-muted mt-7">
        {t("login_no_account")}{" "}
        <Link
          href={redirectTo !== "/dashboard" ? `/register?redirect=${encodeURIComponent(redirectTo)}` : "/register"}
          className="text-wing-heat font-bold"
        >
          {t("login_register_link")}
        </Link>
      </p>

      {/* Legal */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 pt-8">
        {[
          { href: "/privacy", key: "link_privacy" as const },
          { href: "/terms", key: "link_terms" as const },
          { href: "/contact", key: "link_contact" as const },
          { href: "/delete-account", key: "link_delete" as const },
        ].map(({ href, key }) => (
          <Link key={href} href={href} className="font-mono text-[11px] tracking-[0.18em] uppercase text-wing-subtle hover:text-wing-muted transition-colors">
            {t(key)}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-wing-bg flex flex-col items-center justify-center p-6">
      <Suspense fallback={<WingLogo />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
