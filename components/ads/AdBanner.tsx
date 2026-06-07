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

interface AdBannerProps {
  slot?: string;
  layoutKey?: string;
  format?: string;
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
export function AdBanner({ slot, layoutKey, format = "auto", className = "" }: AdBannerProps) {
  const { user, firebaseUser } = useAuth();
  const adRef = useRef<HTMLModElement>(null);
  const initialized = useRef(false);

  const email = firebaseUser?.email ?? user?.email ?? "";
  const shouldShowAd =
    !isNativeApp() &&
    !isGrandfathered(email) &&
    !isPremium(email, user?.subscription?.plan, user?.subscription);

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

  return (
    <div className={`w-full overflow-hidden ${className}`}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot ?? ""}
        data-ad-format={format}
        {...(layoutKey ? { "data-ad-layout-key": layoutKey } : { "data-full-width-responsive": "true" })}
      />
    </div>
  );
}
