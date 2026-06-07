import { NextRequest, NextResponse } from "next/server";
import { loadWing, isAdminOf, removeMemberWithSuccession } from "@/lib/server/wingMembership";
import { getUidFromRequest } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

// An admin removes another member from the wing.
export async function POST(req: NextRequest) {
  try {
    const requesterId = await getUidFromRequest(req);
    if (!requesterId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { wingId, targetId } = await req.json();
    if (!wingId || !targetId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const wing = await loadWing(wingId);
    if (!wing) return NextResponse.json({ error: "Wing not found" }, { status: 404 });

    if (!isAdminOf(wing.data, wing.ownerId, requesterId)) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    // The owner can't be removed by anyone (they must transfer or leave themselves).
    if (targetId === wing.ownerId) {
      return NextResponse.json({ error: "Cannot remove the owner" }, { status: 400 });
    }
    // A co-admin can't remove another co-admin; only the owner can.
    const adminIds = Array.isArray(wing.data.adminIds) ? wing.data.adminIds : [];
    if (adminIds.includes(targetId) && requesterId !== wing.ownerId) {
      return NextResponse.json({ error: "Only the owner can remove an admin" }, { status: 403 });
    }
    if (requesterId === targetId) {
      return NextResponse.json({ error: "Use leave to remove yourself" }, { status: 400 });
    }

    const result = await removeMemberWithSuccession(wingId, targetId);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("Remove member error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
