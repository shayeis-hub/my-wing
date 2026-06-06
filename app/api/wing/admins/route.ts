import { NextRequest, NextResponse } from "next/server";
import { admin } from "@/lib/firebase/admin";
import { loadWing } from "@/lib/server/wingMembership";

export const dynamic = "force-dynamic";

// Appoint or remove a co-admin. Only the owner may manage co-admins.
export async function POST(req: NextRequest) {
  try {
    const { wingId, requesterId, targetId, action } = await req.json();
    if (!wingId || !requesterId || !targetId || !["add", "remove"].includes(action)) {
      return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
    }

    const wing = await loadWing(wingId);
    if (!wing) return NextResponse.json({ error: "Wing not found" }, { status: 404 });
    if (wing.ownerId !== requesterId) {
      return NextResponse.json({ error: "Only the owner can manage admins" }, { status: 403 });
    }
    if (targetId === wing.ownerId) {
      return NextResponse.json({ error: "Owner is already an admin" }, { status: 400 });
    }

    const memberIds = Array.isArray(wing.data.memberIds) ? wing.data.memberIds : [];
    if (action === "add" && !memberIds.includes(targetId)) {
      return NextResponse.json({ error: "Target is not a member" }, { status: 400 });
    }

    await wing.ref.update({
      adminIds:
        action === "add"
          ? admin.firestore.FieldValue.arrayUnion(targetId)
          : admin.firestore.FieldValue.arrayRemove(targetId),
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Manage admin error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
