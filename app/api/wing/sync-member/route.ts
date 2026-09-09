import { NextRequest, NextResponse } from "next/server";
import { admin, getAdminApp } from "@/lib/firebase/admin";
import { getUidFromRequest } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

/**
 * Self-service fixups for your OWN entry in a wing's `members`/`memberIds`
 * arrays — replaces two client-side direct Firestore writes
 * (lib/firebase/firestore.ts's syncWingMemberUid, and the wing-member-photo
 * sync block in lib/firebase/auth.ts's updateUserPhotoURL) that firestore.rules
 * used to allow ANY member to make directly, with no restriction on which
 * uids they added/removed — found via QA (2026-09), see firestore.rules'
 * wings/{wingId} update rule for the corresponding lockdown.
 *
 * Safety: only touches a wing this caller is ALREADY recorded as belonging
 * to (their own users/{uid} doc's wingId/wingIds must already include it —
 * i.e. they were added through a real join/create/admin flow already).
 * This can correct your own bookkeeping, never grant new membership.
 */
export async function POST(req: NextRequest) {
  const uid = await getUidFromRequest(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { wingId, photoURL } = await req.json();
    if (!wingId) return NextResponse.json({ error: "Missing wingId" }, { status: 400 });

    getAdminApp();
    const db = admin.firestore();

    const userSnap = await db.collection("users").doc(uid).get();
    const userData = userSnap.data() ?? {};
    const belongs = userData.wingId === wingId || (Array.isArray(userData.wingIds) && userData.wingIds.includes(wingId));
    if (!belongs) return NextResponse.json({ error: "Not a member of this wing" }, { status: 403 });

    const wingRef = db.collection("wings").doc(wingId);
    const wingSnap = await wingRef.get();
    if (!wingSnap.exists) return NextResponse.json({ error: "Wing not found" }, { status: 404 });

    const wingData = wingSnap.data()!;
    const members: { uid: string; displayName?: string; [k: string]: unknown }[] =
      Array.isArray(wingData.members) ? wingData.members : [];
    const memberIds: string[] = Array.isArray(wingData.memberIds) ? wingData.memberIds : [];

    let idx = members.findIndex((m) => m.uid === uid);
    let oldUid: string | null = null;
    if (idx === -1 && userData.displayName) {
      // Legacy fixup path: a member row was created with a placeholder uid
      // (matched here by displayName) before this account's real uid was
      // known — only reachable because we already confirmed above that
      // `uid`'s own user doc already lists this wing as its own.
      idx = members.findIndex((m) => m.displayName === userData.displayName && m.uid !== uid);
      if (idx !== -1) oldUid = members[idx].uid;
    }
    if (idx === -1) return NextResponse.json({ error: "No matching member row" }, { status: 404 });

    const updatedMembers = members.map((m, i) =>
      i === idx ? { ...m, uid, ...(photoURL ? { photoURL } : {}) } : m
    );
    const updatedMemberIds = oldUid ? memberIds.map((id) => (id === oldUid ? uid : id)) : memberIds;

    await wingRef.update({ members: updatedMembers, memberIds: updatedMemberIds });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("sync-member error:", msg);
    return NextResponse.json({ error: "Failed", detail: msg }, { status: 500 });
  }
}
