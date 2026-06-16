import { NextRequest, NextResponse } from "next/server";
import { admin, getAdminApp } from "@/lib/firebase/admin";
import { getUidFromRequest } from "@/lib/server/auth";
import { COACH_PLANS, COACH_FREE_TRIAL_DAYS, type CoachPlanId } from "@/lib/subscription";

export const dynamic = "force-dynamic";

/**
 * Activates a coach plan for the authenticated business account.
 * NOTE: payment is not wired yet — this is the foundation. Phase 2 will gate
 * activation behind a PayPal subscription webhook.
 */
export async function POST(req: NextRequest) {
  const uid = await getUidFromRequest(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { plan } = (await req.json()) as { plan: CoachPlanId };
  if (!plan || !(plan in COACH_PLANS)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  getAdminApp();
  const db = admin.firestore();

  // Free plan: a one-time 30-day trial. Don't let a coach re-activate it to
  // restart the clock if they already used it.
  const coachData: Record<string, unknown> = {
    plan,
    maxClients: COACH_PLANS[plan].maxClients,
    active: true,
  };
  if (plan === "free") {
    const existing = (await db.collection("users").doc(uid).get()).data()?.coach;
    if (existing?.plan === "free" && existing?.expiresAt) {
      return NextResponse.json({ error: "Free trial already used" }, { status: 409 });
    }
    const expires = new Date();
    expires.setDate(expires.getDate() + COACH_FREE_TRIAL_DAYS);
    coachData.expiresAt = expires.toISOString();
  }

  await db.collection("users").doc(uid).set(
    { accountType: "business", coach: coachData },
    { merge: true }
  );

  return NextResponse.json({ ok: true, plan, maxClients: COACH_PLANS[plan].maxClients });
}
