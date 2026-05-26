"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Zap, Check, Crown, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/lib/i18n";
import { isGrandfathered, isPremium, FREE_LIMITS } from "@/lib/subscription";
import { format } from "date-fns";
import toast from "react-hot-toast";
import type { Subscription } from "@/types";

export default function SubscriptionPage() {
  const { user, firebaseUser } = useAuth();
  const { t, lang } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loadingCheckout, setLoadingCheckout] = useState<"monthly" | "yearly" | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);

  const email = firebaseUser?.email ?? user?.email ?? "";
  const sub: Subscription | undefined = user?.subscription;
  const grandfathered = isGrandfathered(email);
  const premium = isPremium(email, sub?.plan);

  useEffect(() => {
    if (searchParams.get("success") === "1") {
      toast.success(lang === "he" ? "ברוך הבא ל-Premium! 🎉" : "Welcome to Premium! 🎉");
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
        body: JSON.stringify({ priceType: type, userId: firebaseUser.uid }),
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
      const { url } = await res.json();
      window.location.href = url;
    } catch {
      toast.error(lang === "he" ? "שגיאה בפתיחת ניהול מנוי" : "Failed to open billing portal");
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

  const expiresAt = sub?.expiresAt
    ? format((sub.expiresAt as unknown as { toDate: () => Date }).toDate(), "dd/MM/yyyy")
    : null;

  return (
    <div className="min-h-screen bg-wing-bg" dir={lang === "he" ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="sticky top-0 bg-wing-bg/80 backdrop-blur-md border-b border-wing-border z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 hover:bg-wing-elevated rounded-xl">
            <ArrowLeft size={20} className="text-wing-muted" />
          </button>
          <h1 className="font-black text-wing-ink text-lg">{t("upgrade_manage")}</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">

        {/* Current status card */}
        <div className={`rounded-3xl p-5 ${premium ? "bg-gradient-to-br from-wing-primary to-wing-heat" : "bg-wing-surface border border-wing-border"}`}>
          <div className="flex items-center gap-3">
            {premium ? (
              <Crown size={28} className="text-yellow-300 fill-yellow-300" />
            ) : (
              <Zap size={28} className="text-wing-muted" />
            )}
            <div>
              <p className={`font-black text-lg ${premium ? "text-white" : "text-wing-ink"}`}>
                {grandfathered
                  ? "Wing VIP 👑"
                  : premium
                  ? t("upgrade_active")
                  : t("upgrade_free")}
              </p>
              {premium && !grandfathered && expiresAt && (
                <p className="text-xs text-white/80">
                  {(t("upgrade_renews") as (d: string) => string)(expiresAt)}
                </p>
              )}
              {!premium && (
                <p className="text-xs text-wing-muted">
                  {lang === "he"
                    ? `${FREE_LIMITS.mealPhotosPerDay} תמונות ארוחה ביום · עד ${FREE_LIMITS.wingMembers} חברים`
                    : `${FREE_LIMITS.mealPhotosPerDay} meal photos/day · up to ${FREE_LIMITS.wingMembers} members`}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Features list */}
        <div className="bg-wing-surface border border-wing-border rounded-3xl p-5 space-y-3">
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

        {/* Upgrade / manage buttons */}
        {grandfathered ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-center">
            <p className="text-sm font-semibold text-yellow-800">
              {lang === "he"
                ? "אתה/את חלק מקבוצת המייסדים של Wing — גישה מלאה לעולם ועד 💛"
                : "You're a Wing founder — full access forever 💛"}
            </p>
          </div>
        ) : premium ? (
          <div className="space-y-3">
            <Button
              variant="secondary"
              className="w-full"
              onClick={handlePortal}
              loading={loadingPortal}
            >
              {t("upgrade_cancel")}
            </Button>
            {sub?.cancelPending && (
              <p className="text-center text-sm text-orange-600 bg-orange-50 rounded-2xl px-4 py-2.5">
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
          </div>
        )}
      </div>
    </div>
  );
}
