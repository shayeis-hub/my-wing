import { NextRequest, NextResponse } from "next/server";
import { admin, getAdminApp } from "@/lib/firebase/admin";
import type { SubscriptionProvider } from "@/types";

export const dynamic = "force-dynamic";

// Verified against a real sandbox-fired test event (2026-08-21): the webhook
// payload's store field is an uppercase enum ("APP_STORE" / "PLAY_STORE"),
// unlike the REST subscriber API's lowercase "app_store" / "play_store".
function providerForStore(store: string | undefined): SubscriptionProvider {
  return store === "PLAY_STORE" ? "google" : "apple";
}

// RevenueCat webhook payload shape (https://www.revenuecat.com/docs/integrations/webhooks).
// NOTE: field names below reflect RevenueCat's documented format as of this
// writing — verify against a real sandbox-fired event during IAP testing
// before relying on this in production, per the implementation plan's caveat.
interface RevenueCatEvent {
  type: string;
  app_user_id: string;
  original_app_user_id?: string;
  product_id?: string;
  transaction_id?: string;
  original_transaction_id?: string;
  expiration_at_ms?: number | null;
  store?: string;
  transferred_from?: string[];
  transferred_to?: string[];
}

async function resolveUserRef(
  db: admin.firestore.Firestore,
  event: RevenueCatEvent
): Promise<admin.firestore.DocumentReference | null> {
  // RevenueCat's appUserID is configured (client-side, see RevenueCatSync) to
  // equal the Firebase uid, so this is a direct lookup — no query needed.
  for (const uid of [event.app_user_id, event.original_app_user_id]) {
    if (!uid) continue;
    const ref = db.collection("users").doc(uid);
    if ((await ref.get()).exists) return ref;
  }
  return null;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  let payload: { event?: RevenueCatEvent };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Verify the shared secret RevenueCat echoes back in the Authorization
  // header (configured in the RevenueCat dashboard's webhook settings).
  // Without this, anyone could POST a forged "purchase" event for free access.
  const expectedAuth = process.env.REVENUECAT_WEBHOOK_AUTH;
  if (!expectedAuth) {
    console.error("REVENUECAT_WEBHOOK_AUTH not set — rejecting webhook");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }
  const receivedAuth = req.headers.get("authorization") ?? "";
  if (receivedAuth !== expectedAuth) {
    console.warn("RevenueCat webhook auth mismatch — rejecting");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const event = payload.event;
  if (!event?.type || !event.app_user_id) {
    return NextResponse.json({ ok: true });
  }

  console.log(`RevenueCat webhook: ${event.type}`, event.app_user_id);

  getAdminApp();
  const db = admin.firestore();
  const userRef = await resolveUserRef(db, event);

  if (!userRef) {
    console.warn("RevenueCat webhook: no user found for app_user_id", event.app_user_id);
    return NextResponse.json({ ok: true });
  }

  const expiresAt = event.expiration_at_ms
    ? new Date(event.expiration_at_ms).toISOString()
    : undefined;

  switch (event.type) {
    case "INITIAL_PURCHASE":
    case "RENEWAL":
    case "UNCANCELLATION":
    case "PRODUCT_CHANGE": {
      const provider = providerForStore(event.store);
      await userRef.set(
        {
          subscription: {
            provider,
            plan: "premium",
            status: event.type,
            cancelPending: false,
            ...(expiresAt ? { expiresAt } : {}),
            ...(provider === "apple" && event.original_transaction_id
              ? { appleOriginalTransactionId: event.original_transaction_id }
              : {}),
            ...(event.product_id
              ? provider === "google"
                ? { googleProductId: event.product_id }
                : { appleProductId: event.product_id }
              : {}),
            revenuecatAppUserId: event.app_user_id,
            updatedAt: new Date().toISOString(),
          },
        },
        { merge: true }
      );
      console.log(`User ${userRef.id} → premium (${provider}, ${event.type})`);
      break;
    }

    case "CANCELLATION": {
      // Fired when the user turns off auto-renew — access continues until
      // expiresAt, same semantics as the PayPal cancel handling.
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
      console.log(`User ${userRef.id} → cancel pending (access until expiresAt)`);
      break;
    }

    case "EXPIRATION": {
      await userRef.set(
        {
          subscription: {
            plan: "free",
            status: "expired",
            cancelledAt: new Date().toISOString(),
          },
        },
        { merge: true }
      );
      console.log(`User ${userRef.id} → free (expiration)`);

      // Book mode's "2 free friends" ride on the inviter's subscription —
      // once it truly ends (not just cancelPending, which keeps access
      // until expiresAt), revoke everyone riding on this account.
      const riders = await db.collection("users").where("bookAccess.grantedBy", "==", userRef.id).get();
      if (!riders.empty) {
        const batch = db.batch();
        riders.docs.forEach((riderDoc) => {
          batch.set(riderDoc.ref, { bookAccess: { active: false } }, { merge: true });
        });
        await batch.commit();
        console.log(`Revoked book access for ${riders.size} friend(s) riding on ${userRef.id}`);
      }
      break;
    }

    case "BILLING_ISSUE": {
      // Payment failed — Apple/RevenueCat will retry and eventually send
      // EXPIRATION if it's terminal. Don't downgrade preemptively.
      console.warn(`Billing issue for user ${userRef.id}`);
      break;
    }

    case "TRANSFER": {
      // A user's purchase moved to a different app_user_id (e.g. a fresh
      // install before RevenueCat's local uid linkage was established).
      // Downgrade the "from" account and let a subsequent event (RevenueCat
      // resends the relevant lifecycle event for the new owner) grant the
      // "to" account — avoids double-granting premium from this event alone.
      for (const fromUid of event.transferred_from ?? []) {
        if (fromUid === userRef.id) {
          await userRef.set(
            { subscription: { plan: "free", status: "transferred" } },
            { merge: true }
          );
          console.log(`User ${userRef.id} → free (subscription transferred away)`);
        }
      }
      break;
    }

    default:
      console.log(`Unhandled RevenueCat event: ${event.type}`);
  }

  return NextResponse.json({ ok: true });
}
