import { NextRequest, NextResponse } from "next/server";
import { admin, getAdminApp } from "@/lib/firebase/admin";
import { cancelSubscription, getSubscription } from "@/lib/paypal";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { userId, action = "cancel" } = (await req.json()) as {
      userId: string;
      action?: "cancel" | "status";
    };

    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

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

    // Cancel
    await cancelSubscription(subscriptionId);

    // Update Firestore immediately (webhook will also fire)
    await db.collection("users").doc(userId).set(
      { subscription: { ...sub, plan: "free", cancelledAt: new Date().toISOString() } },
      { merge: true }
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PayPal portal error:", err);
    return NextResponse.json({ error: "Failed to manage subscription" }, { status: 500 });
  }
}
