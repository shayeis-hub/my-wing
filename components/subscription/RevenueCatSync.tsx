"use client";

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { isNativeApp } from "@/lib/platform";
import { Capacitor } from "@capacitor/core";

// Links RevenueCat's purchaser identity to our Firebase uid so a purchase
// made in the app maps 1:1 to the user's Firestore document — no separate
// account/login step for billing. Configuring on every native session (not
// just at purchase time) lets the SDK auto-restore already-owned entitlements.
export function RevenueCatSync() {
  const { firebaseUser } = useAuth();

  useEffect(() => {
    if (!isNativeApp() || !firebaseUser) return;
    const apiKey =
      Capacitor.getPlatform() === "ios"
        ? process.env.NEXT_PUBLIC_REVENUECAT_IOS_API_KEY
        : process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_API_KEY;
    if (!apiKey) return;

    let cancelled = false;
    import("@revenuecat/purchases-capacitor").then(({ Purchases }) => {
      if (cancelled) return;
      Purchases.configure({ apiKey, appUserID: firebaseUser.uid });
    });
    return () => {
      cancelled = true;
    };
  }, [firebaseUser]);

  return null;
}
