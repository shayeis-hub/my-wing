"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/lib/i18n";
import { changePassword } from "@/lib/firebase/auth";

// Forced first-login password change for fitDad accounts — see
// components/layout/AuthGuard.tsx's mustChangePassword redirect. Their
// initial password is their own phone number, which isn't really secret
// inside a shared wing, so this isn't skippable.
export default function ChangePasswordPage() {
  const { firebaseUser } = useAuth();
  const { lang, dir } = useLanguage();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError(lang === "he" ? "הסיסמה חייבת להכיל לפחות 6 תווים" : "Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      setError(lang === "he" ? "הסיסמאות לא תואמות" : "Passwords don't match");
      return;
    }
    if (!firebaseUser) return;
    setLoading(true);
    try {
      await changePassword(firebaseUser, password);
      toast.success(lang === "he" ? "הסיסמה עודכנה" : "Password updated");
      router.replace("/dashboard");
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === "auth/requires-recent-login") {
        setError(lang === "he"
          ? "מטעמי אבטחה, יש להתחבר מחדש לפני החלפת הסיסמה — התנתק/י והתחבר/י שוב."
          : "For security, please log out and back in before changing your password.");
      } else {
        setError(lang === "he" ? "שגיאה בעדכון הסיסמה" : "Failed to update password");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-wing-bg flex items-center justify-center px-4" dir={dir}>
      <div className="max-w-sm w-full bg-wing-surface border border-wing-border rounded-[24px] p-6 space-y-5">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-wing-elevated flex items-center justify-center">
            <KeyRound size={22} className="text-wing-primary" />
          </div>
          <h1 className="font-black text-lg text-wing-ink">
            {lang === "he" ? "בחר/י סיסמה חדשה" : "Choose a new password"}
          </h1>
          <p className="text-sm text-wing-muted">
            {lang === "he"
              ? "הסיסמה שקיבלת (מספר הטלפון שלך) היא זמנית — צריך להחליף אותה לפני שממשיכים."
              : "The password you were given (your phone number) is temporary — set a new one to continue."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={lang === "he" ? "סיסמה חדשה" : "New password"}
            className="w-full px-4 py-3 rounded-2xl border border-wing-border bg-wing-bg text-wing-ink outline-none focus:border-wing-primary"
            autoFocus
          />
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={lang === "he" ? "אימות סיסמה" : "Confirm password"}
            className="w-full px-4 py-3 rounded-2xl border border-wing-border bg-wing-bg text-wing-ink outline-none focus:border-wing-primary"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading || !password || !confirm}
            className="w-full py-3 rounded-2xl bg-wing-primary text-white font-bold disabled:opacity-50"
          >
            {loading ? (lang === "he" ? "מעדכן..." : "Updating...") : (lang === "he" ? "עדכן סיסמה" : "Update password")}
          </button>
        </form>
      </div>
    </div>
  );
}
