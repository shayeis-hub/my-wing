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

async function getUidByCoachSubscription(
  db: admin.firestore.Firestore,
  subscriptionId: string
): Promise<string | null> {
  const snap = await db
    .collection("users")
    .where("coach.paypalSubscriptionId", "==", subscriptionId)
    .limit(1)
    .get();
  return snap.empty ? null : snap.docs[0].id;
}

// When a coach's plan ends, clients keep their data but restart their personal
// 14-day trial (per product spec) and lose the coach-granted premium.
async function churnCoachClients(db: admin.firestore.Firestore, coachId: string) {
  const snap = await db.collection("users").where("coachAccess.coachId", "==", coachId).get();
  if (snap.empty) return;
  const now = new Date().toISOString();
  const batch = db.batch();
  snap.docs.forEach((d) => {
    batch.update(d.ref, { "coachAccess.active": false, trialStartsAt: now });
  });
  await batch.commit();
  console.log(`Coach ${coachId} ended → restarted trial for ${snap.size} client(s)`);
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Verify webhook signature — mandatory. Without this, anyone could POST a
  // forged "subscription activated" event and be granted Premium for free.
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    console.error("PAYPAL_WEBHOOK_ID not set — rejecting webhook");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }
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
    console.warn("PayPal webhook signature verification failed — rejecting");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
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

  // Not a personal subscription? Try coach (business) subscriptions.
  if (!uid) {
    const coachUid = await getUidByCoachSubscription(db, subscriptionId);
    if (coachUid) {
      return handleCoachEvent(db, coachUid, eventType, resource, subscriptionId);
    }
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

    case "BILLING.SUBSCRIPTION.CANCELLED": {
      // PayPal fires this immediately on cancel, but user keeps access until period end.
      // create-portal already set expiresAt + cancelPending — don't downgrade here.
      const existing = (await userRef.get()).data()?.subscription ?? {};
      await userRef.set(
        {
          subscription: {
            ...existing,
            status: "cancelled",
            cancelPending: true,
            cancelledAt: existing.cancelledAt ?? new Date().toISOString(),
          },
        },
        { merge: true }
      );
      console.log(`User ${uid} → cancel pending (access until expiresAt)`);
      break;
    }

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

// Coach (business) subscription lifecycle. Activates/deactivates the coach plan
// and, on end-of-life, restarts each client's personal trial.
async function handleCoachEvent(
  db: admin.firestore.Firestore,
  coachId: string,
  eventType: string,
  resource: Record<string, unknown>,
  subscriptionId: string
) {
  const userRef = db.collection("users").doc(coachId);

  switch (eventType) {
    case "BILLING.SUBSCRIPTION.ACTIVATED":
    case "BILLING.SUBSCRIPTION.UPDATED":
    case "BILLING.SUBSCRIPTION.RE-ACTIVATED": {
      const status = resource.status as string;
      const isActive = status === "ACTIVE" || status === "TRIALING";
      await userRef.set(
        { coach: { active: isActive, paypalSubscriptionId: subscriptionId, status } },
        { merge: true }
      );
      console.log(`Coach ${coachId} → ${isActive ? "active" : "inactive"} (${status})`);
      break;
    }

    case "BILLING.SUBSCRIPTION.CANCELLED": {
      // Cancellation is requested but the paid period may continue — mark pending,
      // keep access until PayPal fires EXPIRED.
      await userRef.set(
        { coach: { cancelPending: true, status: "cancelled" } },
        { merge: true }
      );
      console.log(`Coach ${coachId} → cancel pending`);
      break;
    }

    case "BILLING.SUBSCRIPTION.EXPIRED":
    case "BILLING.SUBSCRIPTION.SUSPENDED": {
      await userRef.set(
        { coach: { active: false, status: eventType.split(".").pop()?.toLowerCase() } },
        { merge: true }
      );
      await churnCoachClients(db, coachId);
      console.log(`Coach ${coachId} → inactive (${eventType}), clients churned`);
      break;
    }

    default:
      console.log(`Unhandled coach PayPal event: ${eventType}`);
  }

  return NextResponse.json({ ok: true });
}
