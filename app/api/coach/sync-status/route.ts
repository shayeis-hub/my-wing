import { NextRequest, NextResponse } from "next/server";
import { admin, getAdminApp } from "@/lib/firebase/admin";
import { getSubscription } from "@/lib/paypal";
import { getUidFromRequest } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

/**
 * Reconciles a pending coach checkout with PayPal's live subscription status.
 * Safety net for when the activation webhook didn't fire: the coach lands on
 * /coach, we pull the real status, and promote the pending checkout into the
 * live plan only if PayPal confirms it's ACTIVE/TRIALING. If the checkout was
 * abandoned (APPROVAL_PENDING) or cancelled, we clear it WITHOUT touching the
 * coach's existing live plan (e.g. an active free trial).
 */
export async function POST(req: NextRequest) {
  try {
    const uid = await getUidFromRequest(req);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    getAdminApp();
    const db = admin.firestore();
    const userRef = db.collection("users").doc(uid);
    const data = (await userRef.get()).data() ?? {};
    const pending = data.coachCheckout;

    if (!pending?.paypalSubscriptionId) {
      return NextResponse.json({ error: "No pending checkout", active: false }, { status: 404 });
    }

    const details = await getSubscription(pending.paypalSubscriptionId);
    const status = (details as { status?: string }).status ?? "UNKNOWN";
    const isActive = status === "ACTIVE" || status === "TRIALING";

    if (isActive) {
      // Promote pending → live plan.
      await userRef.update({
        coach: {
          plan: pending.plan,
          maxClients: pending.maxClients,
          active: true,
          paypalSubscriptionId: pending.paypalSubscriptionId,
          status,
        },
        coachCheckout: admin.firestore.FieldValue.delete(),
      });
      return NextResponse.json({ ok: true, status, active: true });
    }

    // Not active yet. If PayPal considers it dead (cancelled/expired/suspended),
    // clear the abandoned checkout. APPROVAL_PENDING means the user may still be
    // mid-flow elsewhere — leave it so a later webhook can still activate it.
    if (["CANCELLED", "EXPIRED", "SUSPENDED"].includes(status)) {
      await userRef.update({ coachCheckout: admin.firestore.FieldValue.delete() });
    }
    return NextResponse.json({ ok: true, status, active: false });
  } catch (err) {
    console.error("Coach sync-status error:", err);
    return NextResponse.json({ error: "Failed to sync", active: false }, { status: 500 });
  }
}
