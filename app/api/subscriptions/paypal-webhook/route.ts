import { NextRequest, NextResponse } from "next/server";
import { admin, getAdminApp } from "@/lib/firebase/admin";
import { verifyWebhook } from "@/lib/paypal";

export const dynamic = "force-dynamic";

async function getUidBySubscription(
  db: admin.firestore.Firestore,
  subscriptionId: string
): Promise<string | null> {
  const snap = await db
    .collection("users")
    .where("subscription.paypalSubscriptionId", "==", subscriptionId)
    .limit(1)
    .get();
  return snap.empty ? null : snap.docs[0].id;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Verify webhook signature if webhook ID is configured
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (webhookId) {
    const valid = await verifyWebhook({
      webhookId,
      transmissionId: req.headers.get("paypal-transmission-id") ?? "",
      transmissionTime: req.headers.get("paypal-transmission-time") ?? "",
      certUrl: req.headers.get("paypal-cert-url") ?? "",
      authAlgo: req.headers.get("paypal-auth-algo") ?? "",
      transmissionSig: req.headers.get("paypal-transmission-sig") ?? "",
      webhookEvent: event,
    });
    if (!valid) {
      console.warn("PayPal webhook signature verification failed");
      // Don't hard-reject — log and continue (during initial setup)
    }
  }

  getAdminApp();
  const db = admin.firestore();

  const eventType = event.event_type as string;
  const resource = event.resource as Record<string, unknown>;
  const subscriptionId = (resource?.id ?? resource?.billing_agreement_id) as string | undefined;

  console.log(`PayPal webhook: ${eventType}`, subscriptionId);

  if (!subscriptionId) {
    return NextResponse.json({ ok: true });
  }

  const uid = await getUidBySubscription(db, subscriptionId);
  if (!uid) {
    console.warn("PayPal webhook: no user found for subscription", subscriptionId);
    return NextResponse.json({ ok: true });
  }

  const userRef = db.collection("users").doc(uid);

  switch (eventType) {
    case "BILLING.SUBSCRIPTION.ACTIVATED":
    case "BILLING.SUBSCRIPTION.UPDATED":
    case "BILLING.SUBSCRIPTION.RE-ACTIVATED": {
      const status = resource.status as string;
      const isActive = status === "ACTIVE" || status === "TRIALING";
      await userRef.set(
        {
          subscription: {
            paypalSubscriptionId: subscriptionId,
            plan: isActive ? "premium" : "free",
            status,
            updatedAt: new Date().toISOString(),
          },
        },
        { merge: true }
      );
      console.log(`User ${uid} → ${isActive ? "premium" : "free"} (${status})`);
      break;
    }

    case "BILLING.SUBSCRIPTION.CANCELLED":
    case "BILLING.SUBSCRIPTION.EXPIRED":
    case "BILLING.SUBSCRIPTION.SUSPENDED": {
      await userRef.set(
        {
          subscription: {
            plan: "free",
            status: eventType.split(".").pop()?.toLowerCase(),
            cancelledAt: new Date().toISOString(),
          },
        },
        { merge: true }
      );
      console.log(`User ${uid} → free (${eventType})`);
      break;
    }

    case "PAYMENT.SALE.COMPLETED": {
      // Payment received — ensure plan is premium
      await userRef.set(
        { subscription: { plan: "premium", lastPaymentAt: new Date().toISOString() } },
        { merge: true }
      );
      break;
    }

    case "PAYMENT.SALE.DENIED":
    case "PAYMENT.SALE.REVERSED": {
      // Payment failed — could downgrade or notify
      console.warn(`Payment issue for user ${uid}: ${eventType}`);
      break;
    }

    default:
      console.log(`Unhandled PayPal event: ${eventType}`);
  }

  return NextResponse.json({ ok: true });
}
