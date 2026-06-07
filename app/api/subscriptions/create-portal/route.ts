import { NextRequest, NextResponse } from "next/server";
import { admin, getAdminApp } from "@/lib/firebase/admin";
import { cancelSubscription, getSubscription } from "@/lib/paypal";
import { getUidFromRequest } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const userId = await getUidFromRequest(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { action = "cancel" } = (await req.json()) as {
      action?: "cancel" | "status";
    };

    getAdminApp();
    const db = admin.firestore();
    const userDoc = await db.collection("users").doc(userId).get();
    const sub = userDoc.data()?.subscription ?? {};
    const subscriptionId: string | undefined = sub.paypalSubscriptionId;

    if (!subscriptionId) {
      return NextResponse.json({ error: "No active subscription found" }, { status: 404 });
    }

    if (action === "status") {
      const details = await getSubscription(subscriptionId);
      return NextResponse.json({ status: details.status, subscriptionId });
    }

    // Get subscription details BEFORE cancelling to capture the current period end date.
    // This lets us keep the user as Premium until the end of the paid period.
    const details = await getSubscription(subscriptionId);

    // PayPal returns next_billing_time on the billing_info object.
    // If it's missing (e.g. subscription was in trial), fall back to now + billing interval.
    const nextBillingTime: string | undefined =
      (details as { billing_info?: { next_billing_time?: string } }).billing_info?.next_billing_time;

    const expiresAt = nextBillingTime ?? new Date().toISOString();

    // Cancel with PayPal
    await cancelSubscription(subscriptionId);

    // Keep plan as "premium" until expiresAt — do NOT downgrade immediately.
    // The daily cron job and login check will downgrade once the date passes.
    await db.collection("users").doc(userId).set(
      {
        subscription: {
          ...sub,
          plan: "premium",       // still premium until expiresAt
          cancelPending: true,   // flag: will become free at expiresAt
          cancelledAt: new Date().toISOString(),
          expiresAt,
        },
      },
      { merge: true }
    );

    return NextResponse.json({ ok: true, expiresAt });
  } catch (err) {
    console.error("PayPal portal error:", err);
    return NextResponse.json({ error: "Failed to manage subscription" }, { status: 500 });
  }
}
