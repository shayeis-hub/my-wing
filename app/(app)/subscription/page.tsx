"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Zap, Check, Crown, ArrowLeft, Lock, Smartphone } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/lib/i18n";
import { isGrandfathered, isPremium, getTrialDaysLeft, TRIAL_DAYS } from "@/lib/subscription";
import { isNativeApp } from "@/lib/platform";
import { getHabitByOrder } from "@/lib/book/habits";
import { Capacitor } from "@capacitor/core";
import { format } from "date-fns";
import toast from "react-hot-toast";
import type { Subscription } from "@/types";
import type { Timestamp } from "firebase/firestore";
import type { PurchasesOffering } from "@revenuecat/purchases-capacitor";
import { Suspense } from "react";

const HABIT_1_ID = getHabitByOrder(1)!.id;

function toMs(ts: Timestamp | string | null | undefined): number | null {
  if (!ts) return null;
  if (typeof ts === "string") {
    const ms = Date.parse(ts);
    return isNaN(ms) ? null : ms;
  }
  if (typeof ts.toDate === "function") return ts.toDate().getTime();
  const s = (ts as unknown as { _seconds?: number })._seconds;
  return s ? s * 1000 : null;
}

// Apple and Google require subscriptions bought via IAP to be cancelled
// through the store's own subscription management, not by the merchant —
// there's no "cancel" API call we're allowed to make on the user's behalf.
function openStoreSubscriptionManagement(googleProductId?: string) {
  const url =
    Capacitor.getPlatform() === "android"
      ? `https://play.google.com/store/account/subscriptions?sku=${googleProductId ?? ""}&package=app.wingpact.android`
      : "https://apps.apple.com/account/subscriptions";
  window.open(url, "_system");
}

function SubscriptionPageInner() {
  const { user, firebaseUser } = useAuth();
  const { t, lang, dir } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [nativeOffering, setNativeOffering] = useState<PurchasesOffering | null>(null);
  const [loadingPurchase, setLoadingPurchase] = useState<"monthly" | "yearly" | "restore" | null>(null);
  // The StoreKit sheet covers the WebView during a purchase, which can leave
  // useAuth's Firestore listener stale — so the server-side write that grants
  // premium isn't always pushed to this still-mounted page (leaving and
  // re-entering the screen remounts the listener, which is why that worked).
  // Once iap-sync confirms the entitlement is active server-side, reflect it
  // here immediately rather than waiting on the listener to catch up.
  const [justPurchased, setJustPurchased] = useState(false);
  // RevenueCat/purchases-capacitor abstracts StoreKit vs Play Billing, so the
  // same purchase UI and API calls serve both native platforms.
  const isNativeIAP = isNativeApp();

  const email = firebaseUser?.email ?? user?.email ?? "";
  const sub: Subscription | undefined = user?.subscription;
  const grandfathered = isGrandfathered(email);
  const premium = justPurchased || isPremium(email, sub?.plan, sub, user?.courseAccess);
  const isExpiredPaywall = searchParams.get("expired") === "1";
  // Book-mode users get a separate offering (different price, same
  // WingPact Premium entitlement) — everything downstream (purchase, restore,
  // cancel, iap-sync) is already offering-agnostic, so this fork is enough
  // to reuse the entire native-purchase UI/flow for book mode.
  const isBookMode = !!user?.bookAccess?.active;

  const createdAtMs = toMs(user?.createdAt ?? null);
  const daysLeft = getTrialDaysLeft(createdAtMs);
  // Book mode isn't on a day-count trial at all — free until habit 1 is
  // marked installed (mirrors lib/subscription.ts's isTrialExpired).
  const habit1InstalledAt = user?.habitProgress?.[HABIT_1_ID]?.installedAt;
  const inTrial = isBookMode
    ? !premium && !grandfathered && !habit1InstalledAt
    : !premium && !grandfathered && daysLeft > 0;

  // Business accounts manage their plan on the coach dashboard, not here.
  useEffect(() => {
    if (user?.accountType === "business") {
      router.replace("/coach");
    }
  }, [user?.accountType, router]);

  useEffect(() => {
    if (searchParams.get("success") === "1") {
      toast.success(lang === "he" ? "ברוך הבא ל-Premium!" : "Welcome to Premium!");
    }
    if (searchParams.get("canceled") === "1") {
      toast(lang === "he" ? "ביטלת את תהליך ההרשמה" : "Checkout canceled");
    }
  }, [searchParams, lang]);

  // Fetch RevenueCat's configured offering (monthly/annual packages) once the
  // native SDK has had a chance to configure (see RevenueCatSync in the app layout).
  useEffect(() => {
    if (!isNativeIAP) return;
    let cancelled = false;
    import("@revenuecat/purchases-capacitor").then(async ({ Purchases }) => {
      try {
        const offerings = await Purchases.getOfferings();
        const offering = isBookMode ? offerings.all["book"] ?? null : offerings.current ?? null;
        if (!cancelled) setNativeOffering(offering);
      } catch (err) {
        console.error("RevenueCat getOfferings failed", err);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isNativeIAP, isBookMode]);

  // Asks our server to pull server-verified entitlement state from RevenueCat
  // right after a purchase/restore, so the UI doesn't have to wait on the
  // webhook (which usually lands within seconds, but this closes the race).
  async function syncNativeSubscription(): Promise<boolean> {
    if (!firebaseUser) return false;
    try {
      const token = await firebaseUser.getIdToken();
      const res = await fetch("/api/subscriptions/iap-sync", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return data?.active === true;
    } catch {
      /* the RevenueCat webhook will still land shortly after */
      return false;
    }
  }

  async function handleNativePurchase(type: "monthly" | "yearly") {
    const pkg = type === "yearly" ? nativeOffering?.annual : nativeOffering?.monthly;
    if (!pkg) {
      toast.error(lang === "he" ? "המנוי אינו זמין כרגע" : "This plan isn't available right now");
      return;
    }
    setLoadingPurchase(type);
    const { Purchases, PURCHASES_ERROR_CODE } = await import("@revenuecat/purchases-capacitor");
    try {
      await Purchases.purchasePackage({ aPackage: pkg });
      if (await syncNativeSubscription()) setJustPurchased(true);
      toast.success(lang === "he" ? "ברוך הבא ל-Premium!" : "Welcome to Premium!");
      router.refresh();
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code !== PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
        toast.error(lang === "he" ? "הרכישה נכשלה" : "Purchase failed");
      }
    } finally {
      setLoadingPurchase(null);
    }
  }

  async function handleRestore() {
    setLoadingPurchase("restore");
    try {
      const { Purchases } = await import("@revenuecat/purchases-capacitor");
      await Purchases.restorePurchases();
      if (await syncNativeSubscription()) setJustPurchased(true);
      toast.success(lang === "he" ? "הרכישות שוחזרו" : "Purchases restored");
      router.refresh();
    } catch {
      toast.error(lang === "he" ? "שחזור הרכישות נכשל" : "Restore failed");
    } finally {
      setLoadingPurchase(null);
    }
  }

  const FEATURES = isBookMode
    ? [
        "Continue past habit one, all the way to habit eight",
        "Unlimited meal photo analysis",
        "AI guidance grounded in the book's own rules",
        "No ads",
      ]
    : lang === "he"
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

        {/* Trial banner — book mode isn't on a day clock, so no countdown dots */}
        {inTrial && !isExpiredPaywall && isBookMode && (
          <div className="bg-wing-elevated border border-wing-border rounded-[20px] px-4 py-3">
            <p className="text-sm font-medium text-wing-ink">Free through habit one</p>
            <p className="text-xs text-wing-muted mt-0.5">Mark it installed on the Habits tab whenever you're ready — no day limit.</p>
          </div>
        )}
        {inTrial && !isExpiredPaywall && !isBookMode && (
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
                  {isBookMode ? "Free through habit one" : (t("trial_days_left") as (n: number) => string)(daysLeft)}
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
            {!sub?.cancelPending && (
              <button
                onClick={() => openStoreSubscriptionManagement(sub?.googleProductId)}
                className="w-full py-3 rounded-2xl border border-wing-border bg-wing-surface hover:bg-wing-elevated transition-colors text-sm font-semibold text-wing-ink"
              >
                {t("upgrade_cancel")}
              </button>
            )}
            {!sub?.cancelPending && (
              <p className="text-center text-xs text-wing-subtle">
                {lang === "he"
                  ? `הביטול מתבצע דרך ${sub?.provider === "google" ? "Google Play" : "App Store"}`
                  : `Cancellation is managed through ${sub?.provider === "google" ? "Google Play" : "the App Store"}`}
              </p>
            )}
            {sub?.cancelPending && (
              <p className="text-center text-sm text-wing-muted bg-wing-elevated rounded-2xl px-4 py-2.5">
                {lang === "he"
                  ? "המנוי יסתיים בתום תקופת החיוב הנוכחית"
                  : "Your subscription will end at the current billing period"}
              </p>
            )}
          </div>
        ) : isNativeIAP ? (
          <div className="space-y-3">
            {/* Real In-App Purchase via RevenueCat (StoreKit on iOS, Play
                Billing on Android) — required by both stores' policies for
                digital subscriptions consumed in-app. */}
            {/* Yearly */}
            <button
              onClick={() => handleNativePurchase("yearly")}
              disabled={loadingPurchase !== null || !nativeOffering?.annual}
              className="w-full flex items-center justify-between px-5 py-4 rounded-2xl border-2 border-wing-primary bg-wing-primary/5 hover:bg-wing-primary/10 transition-colors disabled:opacity-60"
            >
              <div className="text-start">
                <p className="font-bold text-wing-ink">{t("upgrade_cta_yearly")}</p>
                <p className="text-wing-primary text-base font-bold">
                  {nativeOffering?.annual?.product.priceString ?? (isBookMode ? "$79 / year" : t("upgrade_yearly"))}
                </p>
              </div>
              <span className="text-xs font-bold text-white bg-wing-primary px-3 py-1 rounded-full">
                {t("upgrade_yearly_badge")}
              </span>
            </button>

            {/* Monthly */}
            <button
              onClick={() => handleNativePurchase("monthly")}
              disabled={loadingPurchase !== null || !nativeOffering?.monthly}
              className="w-full flex items-center justify-between px-5 py-3.5 rounded-2xl border border-wing-border bg-wing-surface hover:bg-wing-elevated transition-colors disabled:opacity-60"
            >
              <div className="text-start">
                <p className="font-medium text-wing-ink">{t("upgrade_cta_monthly")}</p>
                <p className="text-wing-ink text-base font-bold">
                  {nativeOffering?.monthly?.product.priceString ?? (isBookMode ? "$7.90 / month" : t("upgrade_monthly"))}
                </p>
              </div>
            </button>

            <p className="text-center text-xs text-wing-subtle">{t("upgrade_cancel_anytime")}</p>

            <button
              onClick={handleRestore}
              disabled={loadingPurchase !== null}
              className="w-full py-2.5 text-sm text-wing-muted hover:text-wing-ink transition-colors underline underline-offset-2 disabled:opacity-60"
            >
              {t("restore_purchases")}
            </button>

            {isExpiredPaywall && (
              <div className="pt-2 border-t border-wing-border space-y-1.5">
                <button
                  onClick={() => {
                    sessionStorage.setItem("wingpact_view_only_ack", "1");
                    router.replace("/dashboard");
                  }}
                  className="w-full py-2.5 rounded-2xl border border-wing-border bg-wing-elevated text-sm font-semibold text-wing-ink hover:bg-wing-border/40 transition-colors"
                >
                  {t("trial_view_only")}
                </button>
                <p className="text-center text-xs text-wing-subtle">{t("trial_view_only_note")}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Purchases only happen inside the native app now (no web checkout). */}
            <div className="bg-wing-surface border border-wing-border rounded-[20px] p-5 text-center space-y-3">
              <div className="w-11 h-11 mx-auto rounded-2xl bg-wing-elevated flex items-center justify-center">
                <Smartphone size={20} className="text-wing-muted" />
              </div>
              <p className="font-bold text-wing-ink">
                {lang === "he" ? "השדרוג זמין רק דרך האפליקציה" : "Upgrading is only available in the app"}
              </p>
              <p className="text-sm text-wing-muted">
                {lang === "he"
                  ? "הורידו את מבנה כנף מ-App Store או Google Play כדי לשדרג ל-Premium."
                  : "Download Wingpact from the App Store or Google Play to upgrade to Premium."}
              </p>
            </div>

            {/* View only (only when paywall / trial expired) */}
            {isExpiredPaywall && (
              <div className="pt-2 border-t border-wing-border space-y-1.5">
                <button
                  onClick={() => {
                    sessionStorage.setItem("wingpact_view_only_ack", "1");
                    router.replace("/dashboard");
                  }}
                  className="w-full py-2.5 rounded-2xl border border-wing-border bg-wing-elevated text-sm font-semibold text-wing-ink hover:bg-wing-border/40 transition-colors"
                >
                  {t("trial_view_only")}
                </button>
                <p className="text-center text-xs text-wing-subtle">{t("trial_view_only_note")}</p>
              </div>
            )}
          </div>
        )}
      </div>
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
