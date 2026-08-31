import { NextRequest, NextResponse } from "next/server";
import { admin, getAdminApp } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

function nanoid(len: number) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < len; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

export async function POST(req: NextRequest) {
  try {
    const { ownerId, ownerName, name, isBookWing } = await req.json();
    if (!ownerId || !ownerName || !name) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    getAdminApp();
    const db = admin.firestore();

    const inviteToken = nanoid(10);
    const wingRef = db.collection("wings").doc();

    const wingData = {
      name,
      ownerId,
      memberIds: [ownerId],
      members: [{ uid: ownerId, displayName: ownerName }],
      inviteToken,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      // Caps this wing at owner + 2 free-riding friends (see /api/wing/join) —
      // set once at creation, from book onboarding's silent wing creation.
      ...(isBookWing ? { isBookWing: true } : {}),
    };

    await wingRef.set(wingData);
    await db.collection("users").doc(ownerId).update({ wingId: wingRef.id });

    return NextResponse.json({ id: wingRef.id, ...wingData, createdAt: null });
  } catch (err) {
    console.error("Create wing error:", err);
    return NextResponse.json({ error: "Failed to create wing" }, { status: 500 });
  }
}
