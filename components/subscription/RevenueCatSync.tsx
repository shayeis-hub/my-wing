"use client";

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { isNativeApp } from "@/lib/platform";
import { Capacitor } from "@capacitor/core";
import toast from "react-hot-toast"; // TEMP debug import — remove with the debug toasts

// Links RevenueCat's purchaser identity to our Firebase uid so a purchase
// made in the app maps 1:1 to the user's Firestore document — no separate
// account/login step for billing. Configuring on every native session (not
// just at purchase time) lets the SDK auto-restore already-owned entitlements.
export function RevenueCatSync() {
  const { firebaseUser } = useAuth();

  useEffect(() => {
    if (!isNativeApp() || !firebaseUser) return;
    const platform = Capacitor.getPlatform();
    const apiKey =
      platform === "ios"
        ? process.env.NEXT_PUBLIC_REVENUECAT_IOS_API_KEY
        : process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_API_KEY;
    // TEMP debugging Android purchase flow — remove once resolved.
    toast(
      `RC sync: platform=${platform} apiKey=${apiKey ? apiKey.slice(0, 8) + "…" : "MISSING"} uid=${firebaseUser.uid.slice(0, 6)}…`,
      { duration: 8000 }
    );
    if (!apiKey) return;

    let cancelled = false;
    import("@revenuecat/purchases-capacitor").then(({ Purchases }) => {
      if (cancelled) return;
      Purchases.configure({ apiKey, appUserID: firebaseUser.uid });
      toast("RC configure() called", { duration: 5000 });
    });
    return () => {
      cancelled = true;
    };
  }, [firebaseUser]);

  return null;
}
