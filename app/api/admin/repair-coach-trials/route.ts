/**
 * One-time repair for accounts hit by the old checkout bug, where clicking
 * "buy" overwrote a working free trial with an inactive paid plan (plan!=free,
 * active=false) while leaving the original free-trial expiresAt behind.
 *
 * Signature of the corruption: accountType=business, coach.active=false,
 * coach.plan!=free, coach.expiresAt still in the future, and no completed
 * paid subscription. We restore the free trial they actually still have.
 *
 * Run once: GET /api/admin/repair-coach-trials?secret=<CRON_SECRET>
 */
import { NextRequest, NextResponse } from "next/server";
import { admin, getAdminApp } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("secret") !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  getAdminApp();
  const db = admin.firestore();
  const snap = await db.collection("users").where("accountType", "==", "business").get();

  const now = Date.now();
  const repaired: string[] = [];

  for (const doc of snap.docs) {
    const coach = doc.data().coach;
    if (!coach) continue;
    const expiryMs = coach.expiresAt ? new Date(coach.expiresAt).getTime() : 0;
    const corrupted =
      coach.active === false &&
      coach.plan !== "free" &&
      expiryMs > now; // leftover free-trial expiry still valid

    if (!corrupted) continue;

    await doc.ref.update({
      coach: {
        plan: "free",
        maxClients: 1,
        active: true,
        expiresAt: coach.expiresAt,
      },
      coachCheckout: admin.firestore.FieldValue.delete(),
    });
    repaired.push(doc.id);
  }

  return NextResponse.json({ ok: true, repaired, count: repaired.length });
}
