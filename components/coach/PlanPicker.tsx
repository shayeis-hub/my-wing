"use client";

import { Check, Crown } from "lucide-react";
import { COACH_PLANS, type CoachPlanId } from "@/lib/subscription";
import { PLAN_META, PLAN_FEATURES } from "@/components/coach/planMeta";

type Lang = "he" | "en";

/** Plan cards + free-trial CTA. Paid plans have no self-serve checkout, so upgrades open a mail to support. */
export function PlanPicker({
  lang,
  showTrial,
  busy,
  onStartTrial,
  onContactUpgrade,
  heading,
}: {
  lang: Lang;
  showTrial: boolean;
  busy?: boolean;
  onStartTrial: () => void;
  onContactUpgrade: (id: CoachPlanId) => void;
  heading?: boolean;
}) {
  const he = lang === "he";
  return (
    <div className="space-y-4 md:space-y-6">
      {heading && (
        <div className="pt-4 text-center">
          <h1 className="text-2xl font-black text-wing-ink flex items-center justify-center gap-2">
            <Crown size={22} className="text-wing-honey" />
            {he ? "מסלולי דיאטנ/ית" : "Dietitian Plans"}
          </h1>
          <p className="text-sm text-wing-muted mt-1.5">
            {he ? "בחר/י מסלול כדי לפתוח את ניהול הלקוחות" : "Choose a plan to unlock client management"}
          </p>
        </div>
      )}

      {showTrial && (
        <button
          onClick={onStartTrial}
          disabled={busy}
          className="w-full md:max-w-md md:mx-auto md:block bg-wing-elevated border-2 border-dashed border-wing-honey rounded-[20px] px-4 py-3.5 text-center active:scale-[0.98] transition-transform disabled:opacity-50"
        >
          <span className="block font-bold text-wing-ink">{he ? "התחלה בהתנסות חינם" : "Start with a free trial"}</span>
          <span className="block text-xs text-wing-muted mt-0.5">{he ? "לקוח אחד · 30 יום · ללא תשלום" : "One client · 30 days · free"}</span>
        </button>
      )}

      <div className="grid grid-cols-1 gap-3">
        {(["unlimited", "extended", "basic"] as const).map((id) => {
          const p = COACH_PLANS[id];
          const meta = PLAN_META[id];
          const features = id === "basic" ? PLAN_FEATURES.slice(0, 3) : PLAN_FEATURES;
          return (
            <div key={id} className={`relative rounded-[22px] p-5 border bg-wing-surface ${meta.recommended ? "border-wing-heat shadow-sm ring-1 ring-wing-heat/30" : "border-wing-border"}`}>
              {meta.recommended && (
                <span className="absolute -top-2.5 right-5 bg-wing-heat text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full">{he ? "מומלץ" : "Recommended"}</span>
              )}
              <p className="text-lg font-black text-wing-ink">{meta.name}</p>
              <p className="text-xs text-wing-muted mt-1 leading-snug">{meta.tagline[lang]}</p>
              <div className="flex items-end gap-1.5 mt-4">
                <span className="text-[40px] font-black text-wing-ink leading-none tabular">₪{p.priceILS}</span>
                <span className="text-sm text-wing-subtle mb-1">{he ? "/ חודש" : "/ month"}</span>
              </div>
              <p className="text-sm font-bold text-wing-heat mt-2">{meta.clients[lang]}</p>
              <button
                onClick={() => onContactUpgrade(id)}
                className={`w-full mt-4 py-3 rounded-[14px] font-bold text-sm active:scale-[0.98] transition-transform ${meta.recommended ? "bg-wing-heat text-white" : "border border-wing-heat text-wing-heat"}`}
              >
                {he ? "צרו קשר לשדרוג" : "Contact us to upgrade"}
              </button>
              <div className="mt-4 pt-4 border-t border-wing-divider">
                <p className="text-xs font-bold text-wing-muted mb-2">{he ? "מה כלול:" : "What's included:"}</p>
                <ul className="space-y-1.5">
                  {features.map((f) => (
                    <li key={f.he} className="flex items-start gap-2 text-sm text-wing-ink">
                      <Check size={15} className="text-wing-success shrink-0 mt-0.5" />
                      <span>{f[lang]}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-wing-subtle text-center">{he ? "נחזור אליכם תוך יום עסקים אחד" : "We'll get back to you within one business day"}</p>
    </div>
  );
}
