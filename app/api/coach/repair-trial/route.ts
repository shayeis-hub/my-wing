/**
 * Self-service repair for the authenticated coach, for accounts hit by the old
 * checkout bug where clicking "buy" overwrote a working free trial with an
 * inactive paid plan (plan!=free, active=false) while leaving the original
 * free-trial expiresAt behind. Restores the free trial they actually still have.
 *
 * Only touches the caller's own doc, and only when the exact corruption
 * signature is present — a no-op otherwise.
 */
import { NextRequest, NextResponse } from "next/server";
import { admin, getAdminApp } from "@/lib/firebase/admin";
import { getUidFromRequest } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const uid = await getUidFromRequest(req);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    getAdminApp();
    const db = admin.firestore();
    const userRef = db.collection("users").doc(uid);
    const coach = (await userRef.get()).data()?.coach;
    if (!coach) return NextResponse.json({ ok: true, repaired: false });

    const expiryMs = coach.expiresAt ? new Date(coach.expiresAt).getTime() : 0;
    const corrupted =
      coach.active === false &&
      coach.plan !== "free" &&
      expiryMs > Date.now(); // leftover free-trial expiry still valid

    if (!corrupted) return NextResponse.json({ ok: true, repaired: false });

    await userRef.update({
      coach: { plan: "free", maxClients: 1, active: true, expiresAt: coach.expiresAt },
      coachCheckout: admin.firestore.FieldValue.delete(),
    });
    return NextResponse.json({ ok: true, repaired: true });
  } catch (err) {
    console.error("Coach repair-trial error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
