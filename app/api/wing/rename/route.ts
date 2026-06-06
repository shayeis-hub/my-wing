import { NextRequest, NextResponse } from "next/server";
import { admin } from "@/lib/firebase/admin";
import { loadWing, isAdminOf } from "@/lib/server/wingMembership";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { wingId, name, requesterId } = await req.json();
    if (!wingId || !name || !requesterId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const wing = await loadWing(wingId);
    if (!wing) return NextResponse.json({ error: "Wing not found" }, { status: 404 });
    if (!isAdminOf(wing.data, wing.ownerId, requesterId)) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    await admin.firestore().collection("wings").doc(wingId).update({ name });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Rename wing error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
