"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Zap, Check, Crown, ArrowLeft, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/lib/i18n";
import { isGrandfathered, isPremium, getTrialDaysLeft, TRIAL_DAYS } from "@/lib/subscription";
import { format } from "date-fns";
import toast from "react-hot-toast";
import type { Subscription } from "@/types";
import type { Timestamp } from "firebase/firestore";
import { Suspense } from "react";

function toMs(ts: Timestamp | null | undefined): number | null {
  if (!ts) return null;
  if (typeof ts.toDate === "function") return ts.toDate().getTime();
  const s = (ts as unknown as { _seconds?: number })._seconds;
  return s ? s * 1000 : null;
}

function SubscriptionPageInner() {
  const { user, firebaseUser } = useAuth();
  const { t, lang, dir } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loadingCheckout, setLoadingCheckout] = useState<"monthly" | "yearly" | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const email = firebaseUser?.email ?? user?.email ?? "";
  const sub: Subscription | undefined = user?.subscription;
  const grandfathered = isGrandfathered(email);
  const premium = isPremium(email, sub?.plan, sub);
  const isExpiredPaywall = searchParams.get("expired") === "1";

  const createdAtMs = toMs(user?.createdAt ?? null);
  const daysLeft = getTrialDaysLeft(createdAtMs);
  const inTrial = !premium && !grandfathered && daysLeft > 0;

  useEffect(() => {
    if (searchParams.get("success") === "1") {
      toast.success(lang === "he" ? "ברוך הבא ל-Premium!" : "Welcome to Premium!");
    }
    if (searchParams.get("canceled") === "1") {
      toast(lang === "he" ? "ביטלת את תהליך ההרשמה" : "Checkout canceled");
    }
  }, [searchParams, lang]);

  async function handleUpgrade(type: "monthly" | "yearly") {
    if (!firebaseUser?.uid) return;
    setLoadingCheckout(type);
    try {
      const res = await fetch("/api/subscriptions/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceType: type,
          userId: firebaseUser.uid,
          currency: lang === "he" ? "ILS" : "USD",
        }),
      });
      if (!res.ok) throw new Error();
      const { url } = await res.json();
      window.location.href = url;
    } catch {
      toast.error(lang === "he" ? "שגיאה ביצירת תשלום" : "Checkout failed");
      setLoadingCheckout(null);
    }
  }

  async function handlePortal() {
    if (!firebaseUser?.uid) return;
    setLoadingPortal(true);
    try {
      const res = await fetch("/api/subscriptions/create-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: firebaseUser.uid, action: "cancel" }),
      });
      if (!res.ok) throw new Error();
      toast.success(lang === "he" ? "המנוי בוטל" : "Subscription cancelled");
      setShowCancelConfirm(false);
      router.refresh();
    } catch {
      toast.error(lang === "he" ? "שגיאה בביטול המנוי" : "Failed to cancel subscription");
    } finally {
      setLoadingPortal(false);
    }
  }

  const FEATURES = lang === "he"
    ? [
        "ניתוח תמונות ארוחות ללא הגבלה",
        "עד 20 חברים במבנה",
        "סיכומי AI יומיים ושבועיים",
        "ללא פרסומות",
      ]
    : [
        "Unlimited meal photo analysis",
        "Up to 20 wing members",
        "Daily & weekly AI summaries",
        "No ads",
      ];

  const expiresAtMs = toMs(sub?.expiresAt as unknown as Timestamp);
  const expiresAt = expiresAtMs ? format(new Date(expiresAtMs), "dd/MM/yyyy") : null;
  const daysUntilExpiry = expiresAtMs
    ? Math.max(0, Math.ceil((expiresAtMs - Date.now()) / 86_400_000))
    : null;

  return (
    <div className="min-h-screen bg-wing-bg" dir={dir}>
      {/* Header — hide back button when in paywall mode */}
      <div className="sticky top-0 bg-wing-bg/80 backdrop-blur-md border-b border-wing-border z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          {!isExpiredPaywall && (
            <button onClick={() => router.back()} className="p-2 hover:bg-wing-elevated rounded-xl">
              <ArrowLeft size={20} className="text-wing-muted" />
            </button>
          )}
          <h1 className="font-black text-wing-ink text-lg">{t("upgrade_manage")}</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">

        {/* Countdown banner for active premium */}
        {premium && !grandfathered && daysUntilExpiry !== null && expiresAt && (
          <div className={`rounded-[20px] px-5 py-3 flex items-center justify-between ${
            sub?.cancelPending
              ? "bg-orange-50 border border-orange-200"
              : "bg-wing-elevated border border-wing-border"
          }`}>
            <div>
              <p className={`text-xs font-mono uppercase tracking-wider ${
                sub?.cancelPending ? "text-orange-600" : "text-wing-muted"
              }`}>
                {sub?.cancelPending
                  ? (lang === "he" ? "המנוי יסתיים בעוד" : "Subscription ends in")
                  : (lang === "he" ? "חידוש הבא בעוד" : "Next renewal in")}
              </p>
              <p className={`font-black text-lg ${sub?.cancelPending ? "text-orange-700" : "text-wing-ink"}`}>
                {daysUntilExpiry} {lang === "he" ? (daysUntilExpiry === 1 ? "יום" : "ימים") : (daysUntilExpiry === 1 ? "day" : "days")}
              </p>
            </div>
            <p className="text-xs text-wing-muted">{expiresAt}</p>
          </div>
        )}

        {/* Paywall banner — trial expired */}
        {isExpiredPaywall && !premium && !grandfathered && (
          <div className="bg-wing-surface border border-wing-border rounded-[20px] p-5 space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-wing-elevated flex items-center justify-center shrink-0">
                <Lock size={18} className="text-wing-muted" />
              </div>
              <div>
                <p className="font-black text-wing-ink">{t("trial_expired_title")}</p>
                <p className="text-sm text-wing-muted mt-0.5">{t("trial_expired_body")}</p>
              </div>
            </div>
          </div>
        )}

        {/* Trial countdown banner */}
        {inTrial && !isExpiredPaywall && (
          <div className="bg-wing-elevated border border-wing-border rounded-[20px] px-4 py-3 flex items-center justify-between">
            <p className="text-sm font-medium text-wing-ink">
              {(t("trial_days_left") as (n: number) => string)(daysLeft)}
            </p>
            <div className="flex gap-0.5">
              {Array.from({ length: TRIAL_DAYS }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 w-4 rounded-full ${i < (TRIAL_DAYS - daysLeft) ? "bg-wing-border" : "bg-wing-heat"}`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Current status card */}
        <div className={`rounded-[20px] p-5 ${premium ? "bg-gradient-to-br from-wing-primary to-wing-heat" : "bg-wing-surface border border-wing-border"}`}>
          <div className="flex items-center gap-3">
            {premium ? (
              <Crown size={28} className="text-yellow-300 fill-yellow-300" />
            ) : (
              <Zap size={28} className="text-wing-muted" />
            )}
            <div>
              <p className={`font-black text-lg ${premium ? "text-white" : "text-wing-ink"}`}>
                {grandfathered
                  ? "Wingpact Founders"
                  : premium
                  ? t("upgrade_active")
                  : inTrial
                  ? t("trial_active_sub")
                  : t("trial_expired_title")}
              </p>
              {premium && !grandfathered && expiresAt && (
                <p className="text-xs text-white/80">
                  {(t("upgrade_renews") as (d: string) => string)(expiresAt)}
                </p>
              )}
              {inTrial && (
                <p className="text-xs text-wing-muted">
                  {(t("trial_days_left") as (n: number) => string)(daysLeft)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Features list */}
        <div className="bg-wing-surface border border-wing-border rounded-[20px] p-5 space-y-3">
          <p className="font-bold text-wing-ink text-sm">
            {lang === "he" ? "מה כלול ב-Premium:" : "What's included in Premium:"}
          </p>
          {FEATURES.map((f, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                <Check size={12} className="text-green-600" strokeWidth={3} />
              </div>
              <span className="text-sm text-wing-ink">{f}</span>
            </div>
          ))}
        </div>

        {/* Founders */}
        {grandfathered ? (
          <div className="bg-wing-surface border border-wing-border rounded-[20px] p-4 text-center">
            <p className="text-sm font-semibold text-wing-ink">{t("founders_message")}</p>
          </div>
        ) : premium ? (
          <div className="space-y-3">
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => setShowCancelConfirm(true)}
            >
              {t("upgrade_cancel")}
            </Button>
            {sub?.cancelPending && (
              <p className="text-center text-sm text-wing-muted bg-wing-elevated rounded-2xl px-4 py-2.5">
                {lang === "he"
                  ? "המנוי יסתיים בתום תקופת החיוב הנוכחית"
                  : "Your subscription will end at the current billing period"}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Yearly */}
            <button
              onClick={() => handleUpgrade("yearly")}
              disabled={loadingCheckout !== null}
              className="w-full flex items-center justify-between px-5 py-4 rounded-2xl border-2 border-wing-primary bg-wing-primary/5 hover:bg-wing-primary/10 transition-colors disabled:opacity-60"
            >
              <div className="text-start">
                <p className="font-bold text-wing-ink">{t("upgrade_cta_yearly")}</p>
                <p className="text-wing-muted text-sm">{t("upgrade_yearly")}</p>
              </div>
              <span className="text-xs font-bold text-white bg-wing-primary px-3 py-1 rounded-full">
                {t("upgrade_yearly_badge")}
              </span>
            </button>

            {/* Monthly */}
            <button
              onClick={() => handleUpgrade("monthly")}
              disabled={loadingCheckout !== null}
              className="w-full flex items-center justify-between px-5 py-3.5 rounded-2xl border border-wing-border bg-wing-surface hover:bg-wing-elevated transition-colors disabled:opacity-60"
            >
              <div className="text-start">
                <p className="font-medium text-wing-ink">{t("upgrade_cta_monthly")}</p>
                <p className="text-wing-muted text-sm">{t("upgrade_monthly")}</p>
              </div>
            </button>

            <p className="text-center text-xs text-wing-subtle">{t("upgrade_cancel_anytime")}</p>

            {/* View only (only when paywall / trial expired) */}
            {isExpiredPaywall && (
              <div className="pt-2 border-t border-wing-border space-y-1.5">
                <button
                  onClick={() => router.replace("/dashboard")}
                  className="w-full py-2.5 text-sm text-wing-muted hover:text-wing-ink transition-colors underline underline-offset-2"
                >
                  {t("trial_view_only")}
                </button>
                <p className="text-center text-xs text-wing-subtle">{t("trial_view_only_note")}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cancel confirmation modal */}
      {showCancelConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !loadingPortal && setShowCancelConfirm(false)}
        >
          <div
            className="bg-wing-surface rounded-[20px] p-6 max-w-sm w-full space-y-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-black text-wing-ink text-lg">
              {lang === "he" ? "ביטול מנוי" : "Cancel subscription"}
            </h3>
            <p className="text-sm text-wing-muted leading-relaxed">
              {lang === "he"
                ? "האם אתה בטוח שברצונך לבטל את המנוי? הגישה ל-Premium תסתיים בסוף תקופת החיוב הנוכחית."
                : "Are you sure you want to cancel? Premium access will end at the current billing period."}
            </p>
            <div className="flex gap-3 pt-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setShowCancelConfirm(false)}
                disabled={loadingPortal}
              >
                {lang === "he" ? "חזרה" : "Back"}
              </Button>
              <Button
                className="flex-1"
                onClick={handlePortal}
                loading={loadingPortal}
              >
                {lang === "he" ? "בטל מנוי" : "Cancel"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SubscriptionPage() {
  return (
    <Suspense>
      <SubscriptionPageInner />
    </Suspense>
  );
}
