"use client";

import { useState } from "react";
import { X, Zap, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { FREE_LIMITS } from "@/lib/subscription";
import { isNativeApp } from "@/lib/platform";

interface UpgradeModalProps {
  onClose: () => void;
  /** Show "you hit the limit" messaging instead of generic upsell */
  limitReached?: boolean;
}

const FEATURES = {
  he: [
    "ניתוח תמונות ארוחות ללא הגבלה",
    "עד 20 חברים במבנה",
    "סיכומי AI יומיים ושבועיים",
    "ללא פרסומות",
  ],
  en: [
    "Unlimited meal photo analysis",
    "Up to 20 wing members",
    "Daily & weekly AI summaries",
    "No ads",
  ],
};

export function UpgradeModal({ onClose, limitReached = false }: UpgradeModalProps) {
  const { t, lang } = useLanguage();
  const { firebaseUser } = useAuth();
  const [loading, setLoading] = useState<"monthly" | "yearly" | null>(null);

  async function handleUpgrade(type: "monthly" | "yearly") {
    setLoading(type);
    try {
      const res = await fetch("/api/subscriptions/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceType: type, userId: firebaseUser?.uid }),
      });
      if (!res.ok) throw new Error("checkout failed");
      const { url } = await res.json();
      window.location.href = url;
    } catch {
      setLoading(null);
    }
  }

  const features = lang === "he" ? FEATURES.he : FEATURES.en;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-wing-primary to-wing-heat px-6 pt-8 pb-10">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={18} className="text-white" />
          </button>
          <div className="flex items-center gap-2 mb-3">
            <Zap size={22} className="text-yellow-300 fill-yellow-300" />
            <span className="text-xs font-bold text-yellow-300 uppercase tracking-wider">Wing Premium</span>
          </div>
          {limitReached ? (
            <>
              <h2 className="text-xl font-black text-white">
                {t("upgrade_limit_title")}
              </h2>
              <p className="text-sm text-white/80 mt-1">
                {(t("upgrade_limit_body") as (n: number) => string)(FREE_LIMITS.mealPhotosPerDay)}
              </p>
            </>
          ) : (
            <>
              <h2 className="text-xl font-black text-white">{t("upgrade_title")}</h2>
              <p className="text-sm text-white/80 mt-1">{t("upgrade_subtitle")}</p>
            </>
          )}
        </div>

        {/* Features */}
        <div className="px-6 -mt-5">
          <div className="bg-white rounded-2xl border border-wing-border shadow-sm p-4 space-y-2.5">
            {features.map((f, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <Check size={12} className="text-green-600" strokeWidth={3} />
                </div>
                <span className="text-sm text-wing-ink">{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing */}
        {isNativeApp() ? (
          <div className="px-6 py-5">
            <div className="bg-wing-elevated border border-wing-border rounded-2xl p-4 text-center space-y-1.5">
              <p className="font-bold text-wing-ink text-sm">{t("upgrade_web_only_title")}</p>
              <p className="text-xs text-wing-muted leading-relaxed">{t("upgrade_web_only_body")}</p>
            </div>
          </div>
        ) : (
          <>
            <div className="px-6 py-5 space-y-3">
              {/* Yearly — highlighted */}
              <button
                onClick={() => handleUpgrade("yearly")}
                disabled={loading !== null}
                className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border-2 border-wing-primary bg-wing-primary/5 hover:bg-wing-primary/10 transition-colors disabled:opacity-60"
              >
                <div className="text-start">
                  <p className="font-bold text-wing-ink text-sm">{t("upgrade_cta_yearly")}</p>
                  <p className="text-wing-muted text-xs">{t("upgrade_yearly")}</p>
                </div>
                <span className="text-xs font-bold text-white bg-wing-primary px-2.5 py-1 rounded-full">
                  {t("upgrade_yearly_badge")}
                </span>
              </button>

              {/* Monthly */}
              <button
                onClick={() => handleUpgrade("monthly")}
                disabled={loading !== null}
                className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border border-wing-border bg-wing-elevated hover:bg-wing-surface transition-colors disabled:opacity-60"
              >
                <div className="text-start">
                  <p className="font-medium text-wing-ink text-sm">{t("upgrade_cta_monthly")}</p>
                  <p className="text-wing-muted text-xs">{t("upgrade_monthly")}</p>
                </div>
              </button>

              <p className="text-center text-xs text-wing-subtle">{t("upgrade_cancel_anytime")}</p>
            </div>

            {loading && (
              <div className="px-6 pb-5 text-center">
                <p className="text-xs text-wing-muted animate-pulse">מעביר לדף תשלום...</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
