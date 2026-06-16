import { NextRequest, NextResponse } from "next/server";
import { admin, getAdminApp } from "@/lib/firebase/admin";
import { canAddWingMember, canCoachAddClient, FREE_LIMITS } from "@/lib/subscription";
import type { CoachPlanId } from "@/lib/subscription";

export const dynamic = "force-dynamic";

// Counts distinct clients (members other than the coach) across all wings the
// coach owns — used to enforce the coach plan's maxClients across the account.
async function countCoachClients(
  db: FirebaseFirestore.Firestore,
  coachId: string
): Promise<number> {
  const snap = await db.collection("wings").where("ownerId", "==", coachId).get();
  const clients = new Set<string>();
  snap.docs.forEach((d) => {
    const ids: string[] = Array.isArray(d.data().memberIds) ? d.data().memberIds : [];
    ids.filter((id) => id !== coachId).forEach((id) => clients.add(id));
  });
  return clients.size;
}

export async function POST(req: NextRequest) {
  try {
    const { token, userId, displayName, photoURL } = await req.json();
    if (!token || !userId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    getAdminApp();
    const db = admin.firestore();
    const member = { uid: userId, displayName, ...(photoURL ? { photoURL } : {}) };

    // ── 1. Try a normal wing invite token (group / regular wing) ────────────────
    const wingSnap = await db.collection("wings").where("inviteToken", "==", token).limit(1).get();

    if (!wingSnap.empty) {
      const wingDoc = wingSnap.docs[0];
      const wingData = wingDoc.data();
      const ownerId: string = wingData.ownerId ?? wingData.createdBy ?? "";
      const memberIds: string[] = Array.isArray(wingData.memberIds) ? wingData.memberIds : [];

      if (memberIds.includes(userId)) {
        return NextResponse.json({ error: "Already a member" }, { status: 409 });
      }

      const ownerDoc = await db.collection("users").doc(ownerId).get();
      const ownerData = ownerDoc.data() ?? {};
      const ownerEmail: string = ownerData.email ?? "";
      const ownerPlan = ownerData.subscription?.plan ?? "free";
      const isCoach = ownerData.accountType === "business" && ownerData.coach?.active;

      // Limit check — coach plan limit for business owners, free limit otherwise
      if (isCoach) {
        const coachPlan = (ownerData.coach?.plan ?? "basic") as CoachPlanId;
        const clientCount = await countCoachClients(db, ownerId);
        if (!canCoachAddClient(coachPlan, clientCount)) {
          return NextResponse.json(
            { error: "COACH_LIMIT_REACHED", message: "Coach plan client limit reached" },
            { status: 403 }
          );
        }
      } else if (!canAddWingMember(ownerEmail, ownerPlan, memberIds.length)) {
        return NextResponse.json(
          {
            error: "WING_LIMIT_REACHED",
            limit: FREE_LIMITS.wingMembers,
            message: `This wing has reached the free plan limit of ${FREE_LIMITS.wingMembers} members`,
          },
          { status: 403 }
        );
      }

      await wingDoc.ref.update({
        memberIds: admin.firestore.FieldValue.arrayUnion(userId),
        members: admin.firestore.FieldValue.arrayUnion(member),
      });

      const userUpdate: Record<string, unknown> = {
        wingId: wingDoc.id,
        wingIds: admin.firestore.FieldValue.arrayUnion(wingDoc.id),
      };
      if (isCoach) {
        // Client gets full access while the coach's plan is active
        userUpdate.coachAccess = { coachId: ownerId, wingId: wingDoc.id, active: true };
      }
      await db.collection("users").doc(userId).update(userUpdate);

      const updatedSnap = await wingDoc.ref.get();
      return NextResponse.json({ id: wingDoc.id, ...updatedSnap.data()!, createdAt: null });
    }

    // ── 2. Try a private coach invite code → create a fresh 2-person wing ────────
    const inviteRef = db.collection("coachInvites").doc(token);
    const inviteSnap = await inviteRef.get();
    if (inviteSnap.exists && inviteSnap.data()?.active && inviteSnap.data()?.type === "private") {
      const invite = inviteSnap.data()!;
      const coachId: string = invite.coachId;

      const coachDoc = await db.collection("users").doc(coachId).get();
      const coachData = coachDoc.data() ?? {};
      if (!(coachData.accountType === "business" && coachData.coach?.active)) {
        return NextResponse.json({ error: "Coach plan inactive" }, { status: 403 });
      }

      const coachPlan = (coachData.coach?.plan ?? "basic") as CoachPlanId;
      const clientCount = await countCoachClients(db, coachId);
      if (!canCoachAddClient(coachPlan, clientCount)) {
        return NextResponse.json(
          { error: "COACH_LIMIT_REACHED", message: "Coach plan client limit reached" },
          { status: 403 }
        );
      }

      // Private 1-on-1 wing: only the coach + this client. Reuses the entire
      // wing model, so visibility is naturally limited to the two of them.
      const coachName: string = coachData.displayName ?? "מאמן/ת";
      const wingRef = db.collection("wings").doc();
      const inviteToken = Math.random().toString(36).slice(2, 12);
      await wingRef.set({
        name: displayName ? `${displayName}` : `לקוח/ה`,
        ownerId: coachId,
        memberIds: [coachId, userId],
        members: [
          { uid: coachId, displayName: coachName },
          member,
        ],
        inviteToken,
        isPrivateCoachWing: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Add the new wing to the coach's wingIds so it appears in their switcher
      await db.collection("users").doc(coachId).update({
        wingIds: admin.firestore.FieldValue.arrayUnion(wingRef.id),
      });

      await db.collection("users").doc(userId).update({
        wingId: wingRef.id,
        wingIds: admin.firestore.FieldValue.arrayUnion(wingRef.id),
        coachAccess: { coachId, wingId: wingRef.id, active: true },
      });

      await inviteRef.update({ usedCount: admin.firestore.FieldValue.increment(1) });

      const created = await wingRef.get();
      return NextResponse.json({ id: wingRef.id, ...created.data()!, createdAt: null });
    }

    return NextResponse.json({ error: "Invalid invite token" }, { status: 404 });
  } catch (err) {
    console.error("Join wing error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
