import { NextRequest, NextResponse } from "next/server";
import { admin, getAdminApp } from "@/lib/firebase/admin";
import { getUidFromRequest } from "@/lib/server/auth";
import { isCoachActive } from "@/lib/subscription";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const coachId = await getUidFromRequest(req);
    if (!coachId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { clientId, wingId } = (await req.json()) as { clientId: string; wingId: string };
    if (!clientId || !wingId) {
      return NextResponse.json({ error: "Missing clientId or wingId" }, { status: 400 });
    }

    getAdminApp();
    const db = admin.firestore();

    // Verify the coach owns this wing
    const wingDoc = await db.collection("wings").doc(wingId).get();
    if (!wingDoc.exists || wingDoc.data()?.ownerId !== coachId) {
      return NextResponse.json({ error: "Not authorized for this wing" }, { status: 403 });
    }

    // Verify coach plan is active
    const coachData = (await db.collection("users").doc(coachId).get()).data() ?? {};
    if (!(coachData.accountType === "business" && isCoachActive(coachData.coach))) {
      return NextResponse.json({ error: "Coach plan inactive" }, { status: 403 });
    }

    const wingData = wingDoc.data()!;
    const isPrivateWing = wingData.isPrivateCoachWing === true;
    const now = new Date().toISOString();

    const batch = db.batch();

    if (isPrivateWing) {
      // Private 1-on-1 wing: delete it entirely since it only exists for this relationship
      batch.delete(wingDoc.ref);
    } else {
      // Group wing: remove the client from the member lists only
      const updatedMemberIds = (wingData.memberIds as string[]).filter((id) => id !== clientId);
      const updatedMembers = (wingData.members as { uid: string }[]).filter((m) => m.uid !== clientId);
      batch.update(wingDoc.ref, { memberIds: updatedMemberIds, members: updatedMembers });
    }

    // Update the client's user doc:
    // - Deactivate coachAccess and restart personal trial
    // - Remove this wing from their wingIds
    const clientRef = db.collection("users").doc(clientId);
    const clientData = (await clientRef.get()).data() ?? {};
    const updatedWingIds = ((clientData.wingIds as string[]) ?? []).filter((id) => id !== wingId);
    const newWingId = updatedWingIds[0] ?? null; // fall back to another wing if they have one

    batch.update(clientRef, {
      "coachAccess.active": false,
      trialStartsAt: now,
      wingIds: updatedWingIds,
      ...(newWingId !== null
        ? { wingId: newWingId }
        : { wingId: admin.firestore.FieldValue.delete() }),
    });

    // Remove this wing from the coach's wingIds too (for private wings only)
    if (isPrivateWing) {
      batch.update(db.collection("users").doc(coachId), {
        wingIds: admin.firestore.FieldValue.arrayRemove(wingId),
      });
    }

    await batch.commit();

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Remove client error:", err);
    return NextResponse.json({ error: "Failed to remove client" }, { status: 500 });
  }
}
