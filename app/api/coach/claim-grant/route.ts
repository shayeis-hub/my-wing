import { NextRequest, NextResponse } from "next/server";
import { admin, getAdminApp } from "@/lib/firebase/admin";
import { COACH_PLANS, isCoachActive, type CoachPlanId } from "@/lib/subscription";

export const dynamic = "force-dynamic";

/**
 * Applies a pre-arranged dietitian plan (coachGrants/{email}) to the signed-in
 * user once their account exists. Written by an admin ahead of sign-up; the
 * grant turns the account into a business account on the agreed plan for the
 * agreed number of months, counted from the moment it is claimed. Idempotent
 * and cheap: users without a grant get { claimed: false }.
 */
export async function POST(req: NextRequest) {
  const header = req.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  getAdminApp();
  let uid: string;
  let email: string;
  try {
    const decoded = await admin.auth().verifyIdToken(match[1].trim());
    uid = decoded.uid;
    email = (decoded.email ?? "").toLowerCase();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!email) return NextResponse.json({ claimed: false });

  const db = admin.firestore();
  const grantRef = db.doc(`coachGrants/${email}`);

  try {
    const result = await db.runTransaction(async (tx) => {
      const grant = await tx.get(grantRef);
      if (!grant.exists || grant.data()?.claimedBy) return null;
      const userRef = db.doc(`users/${uid}`);
      const user = (await tx.get(userRef)).data() ?? {};

      // Don't downgrade someone already on an active paid plan.
      if (user.accountType === "business" && isCoachActive(user.coach) && user.coach?.plan !== "free") return null;

      const g = grant.data()!;
      const plan = (g.plan in COACH_PLANS ? g.plan : "basic") as CoachPlanId;
      const expires = new Date();
      expires.setMonth(expires.getMonth() + (Number(g.months) || 6));
      tx.set(
        userRef,
        { accountType: "business", coach: { plan, maxClients: COACH_PLANS[plan].maxClients, active: true, expiresAt: expires.toISOString(), grantedBy: "admin-grant" } },
        { merge: true }
      );
      tx.update(grantRef, { claimedBy: uid, claimedAt: admin.firestore.FieldValue.serverTimestamp() });
      return { plan, expiresAt: expires.toISOString() };
    });
    return NextResponse.json(result ? { claimed: true, ...result } : { claimed: false });
  } catch (err) {
    console.error("claim-grant error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
