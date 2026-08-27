"use client";

import { useRouter } from "next/navigation";
import { X, Zap, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/lib/i18n";
import { FREE_LIMITS } from "@/lib/subscription";

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

// This upsell pitch is provider-agnostic — the actual purchase flow (native
// IAP buttons, or "download the app" for web visitors) lives entirely on the
// subscription page, so this modal just points there instead of duplicating it.
export function UpgradeModal({ onClose, limitReached = false }: UpgradeModalProps) {
  const { t, lang } = useLanguage();
  const router = useRouter();

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

        <div className="px-6 py-5">
          <Button className="w-full" onClick={() => router.push("/subscription")}>
            {t("upgrade_manage")}
          </Button>
        </div>
      </div>
    </div>
  );
}
