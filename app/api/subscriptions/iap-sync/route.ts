import { NextRequest, NextResponse } from "next/server";
import { admin, getAdminApp } from "@/lib/firebase/admin";
import { getUidFromRequest } from "@/lib/server/auth";
import type { SubscriptionProvider } from "@/types";

export const dynamic = "force-dynamic";

// The RevenueCat Entitlement identifier configured in the dashboard (step 5
// of the rollout — see the implementation plan) that unlocks Premium.
const ENTITLEMENT_ID = "WingPact Premium";

interface RevenueCatEntitlement {
  expires_date: string | null;
  product_identifier: string;
}

interface RevenueCatSubscriptionInfo {
  store: string; // "app_store" | "play_store" | "promotional" | ...
}

interface RevenueCatSubscriberResponse {
  subscriber: {
    entitlements: Record<string, RevenueCatEntitlement>;
    subscriptions: Record<string, RevenueCatSubscriptionInfo>;
    original_app_user_id: string;
  };
}

function providerForStore(store: string | undefined): SubscriptionProvider {
  return store === "play_store" ? "google" : "apple";
}

// Called right after a purchase/restore resolves client-side, so the UI
// doesn't have to wait on the RevenueCat webhook (which is usually fast, but
// not instant) to see Firestore reflect the new entitlement. The webhook
// remains the source of truth for everything that happens while the app
// isn't open (renewals, cancellations from the store's own settings, refunds).
export async function POST(req: NextRequest) {
  const uid = await getUidFromRequest(req);
  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const secretKey = process.env.REVENUECAT_SECRET_API_KEY;
  if (!secretKey) {
    console.error("REVENUECAT_SECRET_API_KEY not set");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${uid}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  if (!res.ok) {
    console.error("RevenueCat subscriber lookup failed", res.status);
    return NextResponse.json({ error: "Lookup failed" }, { status: 502 });
  }

  const data: RevenueCatSubscriberResponse = await res.json();
  const entitlement = data.subscriber?.entitlements?.[ENTITLEMENT_ID];
  const isActive =
    !!entitlement && (entitlement.expires_date === null || new Date(entitlement.expires_date) > new Date());

  getAdminApp();
  const db = admin.firestore();

  if (isActive) {
    const store = data.subscriber?.subscriptions?.[entitlement.product_identifier]?.store;
    const provider = providerForStore(store);
    await db.doc(`users/${uid}`).set(
      {
        subscription: {
          provider,
          plan: "premium",
          status: "active",
          cancelPending: false,
          ...(entitlement.expires_date ? { expiresAt: entitlement.expires_date } : {}),
          ...(provider === "google"
            ? { googleProductId: entitlement.product_identifier }
            : { appleProductId: entitlement.product_identifier }),
          revenuecatAppUserId: uid,
          updatedAt: new Date().toISOString(),
        },
      },
      { merge: true }
    );
  }

  return NextResponse.json({ ok: true, active: isActive });
}
