"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { isGrandfathered, isPremium } from "@/lib/subscription";
import { isNativeApp } from "@/lib/platform";

const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || "ca-pub-3097267578681712";

/** Inject the AdSense script once, on demand (not globally). */
function ensureAdSenseScript(client: string) {
  if (typeof document === "undefined") return;
  if (document.querySelector('script[data-adsense="1"]')) return;
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
  s.crossOrigin = "anonymous";
  s.setAttribute("data-adsense", "1");
  document.head.appendChild(s);
}

type AdSize = "auto" | "banner" | "large-banner";
// banner      = 320×50  (most compact)
// large-banner = 320×100 (compact but readable)
// auto        = AdSense picks best fit (default, can be large)

interface AdBannerProps {
  slot?: string;
  layoutKey?: string;
  format?: string;
  size?: AdSize;
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * AdSense banner — rendered only for free, non-grandfathered users, on the
 * WEB only (never inside the native app — AdSense ads are not permitted in
 * WebView apps). The AdSense script is loaded on demand here, so it never
 * loads on no-content screens like login/onboarding.
 */
const SIZE_HEIGHTS: Record<AdSize, number | undefined> = {
  "auto":         undefined, // AdSense picks — no constraint
  "banner":       50,        // 320×50 — most compact
  "large-banner": 100,       // 320×100 — compact but more readable
};

export function AdBanner({ slot, layoutKey, format = "auto", size = "auto", className = "" }: AdBannerProps) {
  const { user, firebaseUser } = useAuth();
  const adRef = useRef<HTMLModElement>(null);
  const initialized = useRef(false);

  const email = firebaseUser?.email ?? user?.email ?? "";
  const shouldShowAd =
    !isNativeApp() &&
    !isGrandfathered(email) &&
    !isPremium(email, user?.subscription?.plan, user?.subscription, user?.courseAccess);

  useEffect(() => {
    if (!shouldShowAd || initialized.current) return;
    initialized.current = true;
    ensureAdSenseScript(ADSENSE_CLIENT);
    try {
      (window.adsbygoogle = window.adsbygoogle ?? []).push({});
    } catch {
      // AdSense not loaded yet
    }
  }, [shouldShowAd]);

  if (!shouldShowAd) return null;

  const fixedHeight = SIZE_HEIGHTS[size];
  const insStyle: React.CSSProperties = fixedHeight
    ? { display: "block", width: "100%", height: fixedHeight }
    : { display: "block" };

  return (
    <div
      className={`w-full overflow-hidden ${className}`}
      style={fixedHeight ? { maxHeight: fixedHeight, minHeight: fixedHeight } : undefined}
    >
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={insStyle}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot ?? ""}
        data-ad-format={fixedHeight ? "fixed" : format}
        {...(!fixedHeight && layoutKey ? { "data-ad-layout-key": layoutKey } : {})}
        {...(!fixedHeight ? { "data-full-width-responsive": "true" } : {})}
      />
    </div>
  );
}
