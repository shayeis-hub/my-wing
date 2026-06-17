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

    // Verify the cancellation actually took effect at PayPal — don't trust the
    // call blindly (silent failure = coach keeps getting billed while we say
    // "cancelled"). Same safeguard as the personal cancel flow.
    try {
      const after = await getSubscription(subscriptionId);
      const afterStatus = (after as { status?: string }).status;
      if (afterStatus !== "CANCELLED" && afterStatus !== "EXPIRED") {
        console.error(`Coach cancel did NOT take for ${subscriptionId} — status still ${afterStatus}`);
        return NextResponse.json(
          { error: "Cancellation could not be confirmed. Please try again or contact support." },
          { status: 502 }
        );
      }
    } catch (e) {
      console.error(`Failed to verify coach cancellation for ${subscriptionId}:`, e);
    }

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
