import { NextRequest, NextResponse } from "next/server";
import { admin, getAdminApp } from "@/lib/firebase/admin";
import { getSubscription } from "@/lib/paypal";
import { getUidFromRequest } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

/**
 * Reconciles the coach's plan state with PayPal's live subscription status.
 * This is a safety net for when the webhook didn't fire (or failed verification):
 * the coach lands on /coach, we pull the real status from PayPal, and activate
 * the plan if PayPal says it's ACTIVE/TRIALING.
 */
export async function POST(req: NextRequest) {
  try {
    const uid = await getUidFromRequest(req);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    getAdminApp();
    const db = admin.firestore();
    const userRef = db.collection("users").doc(uid);
    const coach = (await userRef.get()).data()?.coach ?? {};
    const subscriptionId: string | undefined = coach.paypalSubscriptionId;

    if (!subscriptionId) {
      return NextResponse.json({ error: "No subscription", active: false }, { status: 404 });
    }

    const details = await getSubscription(subscriptionId);
    const status = (details as { status?: string }).status ?? "UNKNOWN";
    const isActive = status === "ACTIVE" || status === "TRIALING";

    const update: Record<string, unknown> = {
      "coach.active": isActive,
      "coach.status": status,
    };
    // Paid plans renew automatically — a fixed expiresAt only belongs to the free
    // trial. Clear any stale free-trial expiry left over from a merge during upgrade.
    if (isActive) {
      update["coach.expiresAt"] = admin.firestore.FieldValue.delete();
    }
    await userRef.update(update);

    return NextResponse.json({ ok: true, status, active: isActive });
  } catch (err) {
    console.error("Coach sync-status error:", err);
    return NextResponse.json({ error: "Failed to sync", active: false }, { status: 500 });
  }
}
