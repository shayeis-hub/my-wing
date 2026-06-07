import { NextRequest, NextResponse } from "next/server";
import { admin, getAdminApp } from "@/lib/firebase/admin";
import { createSubscription } from "@/lib/paypal";
import { getUidFromRequest } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

function clean(s: string | undefined): string {
  return (s ?? "").replace(/^﻿/, "").replace(/[^\x20-\x7E]/g, "").trim();
}

function getPlanId(priceType: "monthly" | "yearly", currency: "ILS" | "USD"): string {
  const map: Record<string, string> = {
    monthly_ILS: clean(process.env.PAYPAL_PLAN_ILS_MONTHLY),
    yearly_ILS:  clean(process.env.PAYPAL_PLAN_ILS_YEARLY),
    monthly_USD: clean(process.env.PAYPAL_PLAN_USD_MONTHLY),
    yearly_USD:  clean(process.env.PAYPAL_PLAN_USD_YEARLY),
  };
  return map[`${priceType}_${currency}`] ?? "";
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUidFromRequest(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { priceType, currency = "ILS" } = (await req.json()) as {
      priceType: "monthly" | "yearly";
      currency?: "ILS" | "USD";
    };

    if (!priceType) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    const planId = getPlanId(priceType, currency);
    if (!planId) {
      return NextResponse.json(
        { error: `PayPal plan not configured for ${priceType} ${currency}. Run /api/subscriptions/paypal-setup first.` },
        { status: 500 }
      );
    }

    getAdminApp();
    const db = admin.firestore();
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data() ?? {};
    const email: string = userData.email ?? "";
    const displayName: string = userData.displayName ?? "";

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://wingpact.app";
    const returnUrl = `${baseUrl}/subscription?success=1&userId=${userId}`;
    const cancelUrl = `${baseUrl}/subscription?canceled=1`;

    const { subscriptionId, approvalUrl } = await createSubscription(
      planId,
      returnUrl,
      cancelUrl,
      email || undefined,
      displayName || undefined,
    );

    // Persist pending subscription ID so the webhook can correlate
    await db.collection("users").doc(userId).set(
      { subscription: { paypalSubscriptionId: subscriptionId, plan: "free", currency } },
      { merge: true }
    );

    return NextResponse.json({ url: approvalUrl });
  } catch (err) {
    console.error("Create PayPal checkout error:", err);
    return NextResponse.json({ error: "Failed to create checkout" }, { status: 500 });
  }
}
