"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { isGrandfathered, isPremium } from "@/lib/subscription";

interface AdBannerProps {
  slot?: string;
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * AdSense banner — only rendered for free, non-grandfathered users.
 * Set NEXT_PUBLIC_ADSENSE_CLIENT in Vercel env vars once your AdSense account is approved.
 * Until then the component renders nothing visible.
 */
export function AdBanner({ slot, className = "" }: AdBannerProps) {
  const { user, firebaseUser } = useAuth();
  const adRef = useRef<HTMLModElement>(null);
  const initialized = useRef(false);

  const email = firebaseUser?.email ?? user?.email ?? "";
  const shouldShowAd =
    !isGrandfathered(email) &&
    !isPremium(email, user?.subscription?.plan);

  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

  useEffect(() => {
    if (!shouldShowAd || !clientId || initialized.current) return;
    initialized.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle ?? []).push({});
    } catch {
      // AdSense not loaded yet
    }
  }, [shouldShowAd, clientId]);

  if (!shouldShowAd || !clientId) return null;

  return (
    <div className={`w-full overflow-hidden ${className}`}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={clientId}
        data-ad-slot={slot ?? ""}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
