import { NextRequest, NextResponse } from "next/server";
import { Paddle, Environment, EventName } from "@paddle/paddle-node-sdk";
import { admin, getAdminApp } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

function getPaddle() {
  const key = process.env.PADDLE_API_KEY;
  if (!key) throw new Error("PADDLE_API_KEY env var is missing");
  const isProd = process.env.NODE_ENV === "production";
  return new Paddle(key, {
    environment: isProd ? Environment.production : Environment.sandbox,
  });
}

/** Find Firebase UID from Paddle customer ID via Firestore */
async function getUidByPaddleCustomer(
  db: admin.firestore.Firestore,
  paddleCustomerId: string
): Promise<string | null> {
  const snap = await db
    .collection("users")
    .where("subscription.paddleCustomerId", "==", paddleCustomerId)
    .limit(1)
    .get();
  if (!snap.empty) return snap.docs[0].id;
  return null;
}

export async function POST(req: NextRequest) {
  const paddle = getPaddle();
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("PADDLE_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Webhook secret missing" }, { status: 500 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("paddle-signature") ?? "";

  // Verify signature
  let event: Awaited<ReturnType<typeof paddle.webhooks.unmarshal>>;
  try {
    event = await paddle.webhooks.unmarshal(rawBody, secret, signature);
  } catch (err) {
    console.error("Paddle webhook verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (!event) {
    return NextResponse.json({ error: "Empty event" }, { status: 400 });
  }

  getAdminApp();
  const db = admin.firestore();

  try {
    // ── subscription.activated / subscription.updated ─────────────────────────
    if (
      event.eventType === EventName.SubscriptionActivated ||
      event.eventType === EventName.SubscriptionUpdated
    ) {
      const sub = event.data;
      const customerId = (sub as { customerId?: string }).customerId;
      if (!customerId) break_out: { break break_out; }

      // Try customData first (set during checkout)
      const customData = (sub as { customData?: Record<string, string> }).customData;
      let uid: string | null = customData?.firebaseUid ?? null;
      if (!uid && customerId) uid = await getUidByPaddleCustomer(db, customerId);
      if (!uid) {
        console.warn("No Firebase UID for Paddle customer", customerId);
      } else {
        const subId = (sub as { id?: string }).id;
        const status = (sub as { status?: string }).status;
        const isActive = status === "active" || status === "trialing";

        // scheduledChange might signal a pending cancellation
        const scheduledChange = (sub as { scheduledChange?: { action?: string; effectiveAt?: string } }).scheduledChange;
        const cancelPending = scheduledChange?.action === "cancel";

        // Next billing date
        const nextBilledAt = (sub as { nextBilledAt?: string }).nextBilledAt;
        const expiresAt = nextBilledAt
          ? admin.firestore.Timestamp.fromMillis(new Date(nextBilledAt).getTime())
          : null;

        const subscription: Record<string, unknown> = {
          plan: isActive ? "premium" : "free",
          paddleCustomerId: customerId,
          paddleSubscriptionId: subId,
          provider: "paddle",
          cancelPending: cancelPending ?? false,
          ...(expiresAt ? { expiresAt } : {}),
        };

        await db.collection("users").doc(uid).set({ subscription }, { merge: true });
        console.log(`[paddle-webhook] Updated plan for ${uid}: ${subscription.plan}`);
      }
    }

    // ── subscription.canceled ─────────────────────────────────────────────────
    else if (event.eventType === EventName.SubscriptionCanceled) {
      const sub = event.data;
      const customerId = (sub as { customerId?: string }).customerId;
      if (!customerId) { /* skip */ }
      else {
        const customData = (sub as { customData?: Record<string, string> }).customData;
        let uid: string | null = customData?.firebaseUid ?? null;
        if (!uid) uid = await getUidByPaddleCustomer(db, customerId);
        if (uid) {
          await db.collection("users").doc(uid).set(
            {
              subscription: {
                plan: "free",
                paddleCustomerId: customerId,
                paddleSubscriptionId: null,
                provider: "paddle",
                cancelPending: false,
              },
            },
            { merge: true }
          );
          console.log(`[paddle-webhook] Subscription cancelled for ${uid}`);
        }
      }
    }

    // ── transaction.completed — belt-and-suspenders after checkout ────────────
    else if (event.eventType === EventName.TransactionCompleted) {
      const tx = event.data;
      const customData = (tx as { customData?: Record<string, string> }).customData;
      const uid = customData?.firebaseUid;
      const customerId = (tx as { customerId?: string }).customerId;
      if (uid && customerId) {
        await db.collection("users").doc(uid).set(
          { subscription: { paddleCustomerId: customerId, plan: "premium", provider: "paddle" } },
          { merge: true }
        );
      }
    }
  } catch (err) {
    console.error("[paddle-webhook] Handler error:", err);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
