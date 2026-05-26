import { NextRequest, NextResponse } from "next/server";
import { admin, getAdminApp } from "@/lib/firebase/admin";
import { canAddWingMember, FREE_LIMITS } from "@/lib/subscription";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { token, userId, displayName, photoURL } = await req.json();
    if (!token || !userId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    getAdminApp();
    const db = admin.firestore();

    // Find wing by invite token
    const snap = await db
      .collection("wings")
      .where("inviteToken", "==", token)
      .limit(1)
      .get();

    if (snap.empty) {
      return NextResponse.json({ error: "Invalid invite token" }, { status: 404 });
    }

    const wingDoc = snap.docs[0];
    const wingData = wingDoc.data();
    const ownerId: string = wingData.ownerId ?? wingData.createdBy ?? "";
    const memberIds: string[] = Array.isArray(wingData.memberIds) ? wingData.memberIds : [];

    // Already a member?
    if (memberIds.includes(userId)) {
      return NextResponse.json({ error: "Already a member" }, { status: 409 });
    }

    // Check owner's plan for member limit
    const ownerDoc = await db.collection("users").doc(ownerId).get();
    const ownerData = ownerDoc.data() ?? {};
    const ownerEmail: string = ownerData.email ?? "";
    const ownerPlan = ownerData.subscription?.plan ?? "free";

    if (!canAddWingMember(ownerEmail, ownerPlan, memberIds.length)) {
      return NextResponse.json(
        {
          error: "WING_LIMIT_REACHED",
          limit: FREE_LIMITS.wingMembers,
          message: `This wing has reached the free plan limit of ${FREE_LIMITS.wingMembers} members`,
        },
        { status: 403 }
      );
    }

    // Add member
    const member = { uid: userId, displayName, ...(photoURL ? { photoURL } : {}) };
    await wingDoc.ref.update({
      memberIds: admin.firestore.FieldValue.arrayUnion(userId),
      members: admin.firestore.FieldValue.arrayUnion(member),
    });
    await db.collection("users").doc(userId).update({ wingId: wingDoc.id });

    // Return the updated wing
    const updatedSnap = await wingDoc.ref.get();
    const updated = updatedSnap.data()!;
    return NextResponse.json({ id: wingDoc.id, ...updated, createdAt: null });
  } catch (err) {
    console.error("Join wing error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
