import { NextRequest, NextResponse } from "next/server";
import { loadWing } from "@/lib/server/wingMembership";

export const dynamic = "force-dynamic";

// Transfer wing ownership. Only the current owner may do this.
export async function POST(req: NextRequest) {
  try {
    const { wingId, requesterId, targetId } = await req.json();
    if (!wingId || !requesterId || !targetId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    if (requesterId === targetId) {
      return NextResponse.json({ error: "Already the owner" }, { status: 400 });
    }

    const wing = await loadWing(wingId);
    if (!wing) return NextResponse.json({ error: "Wing not found" }, { status: 404 });
    if (wing.ownerId !== requesterId) {
      return NextResponse.json({ error: "Only the owner can transfer" }, { status: 403 });
    }

    const memberIds = Array.isArray(wing.data.memberIds) ? wing.data.memberIds : [];
    if (!memberIds.includes(targetId)) {
      return NextResponse.json({ error: "Target is not a member" }, { status: 400 });
    }

    // New owner is removed from co-admins; previous owner becomes a co-admin so
    // they keep management rights.
    const adminIds = (Array.isArray(wing.data.adminIds) ? wing.data.adminIds : [])
      .filter((id) => id !== targetId && id !== requesterId);
    adminIds.push(requesterId);

    await wing.ref.update({ ownerId: targetId, adminIds });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Transfer wing error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
