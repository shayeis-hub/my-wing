"use client";

import { useEffect, useRef } from "react";
import { isNativeApp } from "@/lib/platform";

const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || "ca-pub-3097267578681712";

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

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

interface PublicAdBannerProps {
  slot?: string;
  format?: string;
  className?: string;
}

/**
 * AdSense banner for public (unauthenticated) pages — blog, calculator, FAQ.
 * Shows on web only (never inside the native app WebView).
 * No auth check needed — public visitors are never premium.
 */
export function PublicAdBanner({ slot, format = "auto", className = "" }: PublicAdBannerProps) {
  const initialized = useRef(false);

  useEffect(() => {
    if (isNativeApp() || initialized.current) return;
    initialized.current = true;
    ensureAdSenseScript(ADSENSE_CLIENT);
    try {
      (window.adsbygoogle = window.adsbygoogle ?? []).push({});
    } catch {
      // AdSense not ready yet
    }
  }, []);

  if (isNativeApp()) return null;

  return (
    <div className={`w-full overflow-hidden ${className}`}>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot ?? ""}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
