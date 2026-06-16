import { NextRequest, NextResponse } from "next/server";
import { admin, getAdminApp } from "@/lib/firebase/admin";
import { cancelSubscription, getSubscription } from "@/lib/paypal";
import { getUidFromRequest } from "@/lib/server/auth";
import { isCoachActive } from "@/lib/subscription";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const uid = await getUidFromRequest(req);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    getAdminApp();
    const db = admin.firestore();
    const userData = (await db.collection("users").doc(uid).get()).data() ?? {};
    const coach = userData.coach ?? {};

    if (!isCoachActive(coach)) {
      return NextResponse.json({ error: "No active coach plan" }, { status: 404 });
    }
    if (coach.plan === "free") {
      return NextResponse.json({ error: "Free trial cannot be cancelled via PayPal" }, { status: 400 });
    }
    if (coach.cancelPending) {
      return NextResponse.json({ error: "Already cancelled" }, { status: 409 });
    }

    const subscriptionId: string | undefined = coach.paypalSubscriptionId;
    if (!subscriptionId) {
      return NextResponse.json({ error: "No PayPal subscription found" }, { status: 404 });
    }

    // Fetch current period end from PayPal before cancelling
    const details = await getSubscription(subscriptionId);
    const nextBillingTime: string | undefined =
      (details as { billing_info?: { next_billing_time?: string } }).billing_info?.next_billing_time;
    const expiresAt = nextBillingTime ?? new Date().toISOString();

    await cancelSubscription(subscriptionId);

    // Preserve active + plan — only mark pending and set expiry.
    // The webhook (BILLING.SUBSCRIPTION.EXPIRED) will call churnCoachClients when the period ends.
    await db.collection("users").doc(uid).update({
      "coach.cancelPending": true,
      "coach.cancelledAt": new Date().toISOString(),
      "coach.expiresAt": expiresAt,
      "coach.status": "cancelled",
    });

    return NextResponse.json({ ok: true, expiresAt });
  } catch (err) {
    console.error("Coach cancel error:", err);
    return NextResponse.json({ error: "Failed to cancel subscription" }, { status: 500 });
  }
}
