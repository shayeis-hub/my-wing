import { NextRequest, NextResponse } from "next/server";
import { admin, getAdminApp } from "@/lib/firebase/admin";
import { createSubscription, getSubscription, cancelSubscription } from "@/lib/paypal";
import { getUidFromRequest } from "@/lib/server/auth";
import { COACH_PLANS, type CoachPlanId } from "@/lib/subscription";

export const dynamic = "force-dynamic";

function clean(s: string | undefined): string {
  return (s ?? "").replace(/^﻿/, "").replace(/[^\x20-\x7E]/g, "").trim();
}

function coachPlanId(plan: Exclude<CoachPlanId, "free">): string {
  const map: Record<string, string> = {
    basic: clean(process.env.PAYPAL_COACH_PLAN_BASIC),
    extended: clean(process.env.PAYPAL_COACH_PLAN_EXTENDED),
    unlimited: clean(process.env.PAYPAL_COACH_PLAN_UNLIMITED),
  };
  return map[plan] ?? "";
}

export async function POST(req: NextRequest) {
  try {
    const uid = await getUidFromRequest(req);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { plan } = (await req.json()) as { plan: CoachPlanId };
    if (!plan || plan === "free" || !(plan in COACH_PLANS)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const planId = coachPlanId(plan);
    if (!planId) {
      return NextResponse.json(
        { error: `Coach plan not configured for ${plan}. Run /api/coach/paypal-setup first.` },
        { status: 500 }
      );
    }

    getAdminApp();
    const db = admin.firestore();
    const userData = (await db.collection("users").doc(uid).get()).data() ?? {};
    const email: string = userData.email ?? "";
    const displayName: string = userData.displayName ?? "";

    // Never stack subscriptions: cancel any prior billable coach subscription
    // (from a live plan or an earlier pending checkout) before creating a new one.
    const priorSubId: string | undefined =
      userData.coach?.paypalSubscriptionId ?? userData.coachCheckout?.paypalSubscriptionId;
    if (priorSubId) {
      try {
        const existing = await getSubscription(priorSubId);
        const status = (existing as { status?: string }).status;
        if (status === "ACTIVE" || status === "SUSPENDED") {
          await cancelSubscription(priorSubId, "Replaced by a new subscription");
          console.log(`Cancelled prior coach subscription ${priorSubId} before new checkout for ${uid}`);
        }
      } catch (e) {
        console.error(`Failed to check/cancel prior coach subscription ${priorSubId}:`, e);
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://wingpact.app";
    const returnUrl = `${baseUrl}/coach?success=1`;
    const cancelUrl = `${baseUrl}/coach?canceled=1`;

    const { subscriptionId, approvalUrl } = await createSubscription(
      planId,
      returnUrl,
      cancelUrl,
      email || undefined,
      displayName || undefined
    );

    // Store the pending checkout in a SEPARATE field — never touch the live `coach`
    // plan here. Otherwise a coach who clicks "buy" then abandons the PayPal page
    // would lose their working plan (e.g. an active free trial). The webhook (or
    // /api/coach/sync-status) promotes this into `coach` only once PayPal confirms.
    await db.collection("users").doc(uid).set(
      {
        accountType: "business",
        coachCheckout: {
          plan,
          maxClients: COACH_PLANS[plan].maxClients,
          paypalSubscriptionId: subscriptionId,
        },
      },
      { merge: true }
    );

    return NextResponse.json({ url: approvalUrl });
  } catch (err) {
    console.error("Coach checkout error:", err);
    return NextResponse.json({ error: "Failed to create checkout" }, { status: 500 });
  }
}
