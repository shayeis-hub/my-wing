import { NextRequest, NextResponse } from "next/server";
import { joinWing, getUserPlan, getWing } from "@/lib/firebase/firestore";
import { canAddWingMember, isGrandfathered, isPremium, FREE_LIMITS } from "@/lib/subscription";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { token, userId, displayName, photoURL } = await req.json();

    // We need the wing to check the owner's plan before joining
    // First, look up the wing by token (re-use joinWing which does the query)
    // But we need to check BEFORE writing — so we do a pre-check via a helper approach.
    // We call joinWing which already queries by token; if the wing is at capacity it will fail.
    // To do the capacity check properly we need admin or a separate read first.
    // Since joinWing is client-side Firestore, we check here by reading the wing first.

    const { admin, getAdminApp } = await import("@/lib/firebase/admin");
    getAdminApp();
    const db = admin.firestore();

    // Find wing by invite token
    const snap = await db.collection("wings").where("inviteToken", "==", token).limit(1).get();
    if (snap.empty) {
      return NextResponse.json({ error: "Invalid invite token" }, { status: 404 });
    }

    const wingData = snap.docs[0].data();
    const wingId = snap.docs[0].id;
    const ownerId: string = wingData.ownerId ?? wingData.createdBy ?? "";
    const memberIds: string[] = Array.isArray(wingData.memberIds) ? wingData.memberIds : [];
    const currentCount = memberIds.length;

    // Check if user is already a member
    if (memberIds.includes(userId)) {
      return NextResponse.json({ error: "Already a member" }, { status: 409 });
    }

    // Get owner's plan to determine limit
    const ownerUserDoc = await db.collection("users").doc(ownerId).get();
    const ownerData = ownerUserDoc.data() ?? {};
    const ownerEmail: string = ownerData.email ?? "";
    const ownerSub = ownerData.subscription ?? null;
    const ownerPlan = ownerSub?.plan ?? "free";

    if (!canAddWingMember(ownerEmail, ownerPlan, currentCount)) {
      return NextResponse.json(
        {
          error: "WING_LIMIT_REACHED",
          limit: FREE_LIMITS.wingMembers,
          message: `This wing has reached the free plan limit of ${FREE_LIMITS.wingMembers} members`,
        },
        { status: 403 }
      );
    }

    // All good — proceed with the join via client Firestore function
    const wing = await joinWing(token, userId, displayName, photoURL);
    if (!wing) {
      return NextResponse.json({ error: "Invalid invite token" }, { status: 404 });
    }
    return NextResponse.json(wing);
  } catch (err) {
    console.error("Join wing error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
