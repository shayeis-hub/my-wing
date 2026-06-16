import { NextRequest, NextResponse } from "next/server";
import { admin, getAdminApp } from "@/lib/firebase/admin";
import { getUidFromRequest } from "@/lib/server/auth";
import { COACH_PLANS, type CoachPlanId } from "@/lib/subscription";

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
  await db.collection("users").doc(uid).set(
    {
      accountType: "business",
      coach: {
        plan,
        maxClients: COACH_PLANS[plan].maxClients,
        active: true,
      },
    },
    { merge: true }
  );

  return NextResponse.json({ ok: true, plan, maxClients: COACH_PLANS[plan].maxClients });
}
