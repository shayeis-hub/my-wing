import { NextRequest, NextResponse } from "next/server";
import { admin, getAdminApp } from "@/lib/firebase/admin";
import { getUidFromRequest } from "@/lib/server/auth";
import { isCoachActive } from "@/lib/subscription";

export const dynamic = "force-dynamic";

function shortCode(): string {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Creates an invite for the authenticated coach.
 *  - type "private": a one-time-style code that creates a 2-person wing on join.
 *  - type "group":   creates a shared group wing and returns its invite token.
 */
export async function POST(req: NextRequest) {
  const uid = await getUidFromRequest(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { type, label } = (await req.json()) as {
    type: "private" | "group";
    label?: string;
  };
  if (type !== "private" && type !== "group") {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  getAdminApp();
  const db = admin.firestore();

  const coachDoc = await db.collection("users").doc(uid).get();
  const coachData = coachDoc.data() ?? {};
  if (!(coachData.accountType === "business" && isCoachActive(coachData.coach))) {
    return NextResponse.json({ error: "Coach plan inactive" }, { status: 403 });
  }

  if (type === "group") {
    // Create a shared group wing; clients join via its standard invite token.
    const inviteToken = shortCode() + shortCode();
    const wingRef = db.collection("wings").doc();
    await wingRef.set({
      name: label?.trim() || "קבוצה חדשה",
      ownerId: uid,
      memberIds: [uid],
      members: [{ uid, displayName: coachData.displayName ?? "מאמן/ת" }],
      inviteToken,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await db.collection("users").doc(uid).update({
      wingIds: admin.firestore.FieldValue.arrayUnion(wingRef.id),
    });
    return NextResponse.json({ ok: true, type, wingId: wingRef.id, token: inviteToken });
  }

  // Private invite code (resolved by /api/wing/join → creates a 2-person wing)
  const code = shortCode() + shortCode();
  await db.collection("coachInvites").doc(code).set({
    code,
    coachId: uid,
    type: "private",
    label: label?.trim() || null,
    active: true,
    usedCount: 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return NextResponse.json({ ok: true, type, token: code });
}

export async function DELETE(req: NextRequest) {
  const uid = await getUidFromRequest(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = (await req.json()) as { code: string };
  if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });

  getAdminApp();
  const db = admin.firestore();
  const ref = db.collection("coachInvites").doc(code);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.coachId !== uid) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await ref.delete();
  return NextResponse.json({ ok: true });
}
