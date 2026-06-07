import { NextRequest, NextResponse } from "next/server";
import { removeMemberWithSuccession } from "@/lib/server/wingMembership";
import { getUidFromRequest } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

// A member leaves the wing (also used during account deletion). Handles owner
// succession automatically. You can only remove yourself — the user is taken
// from the verified token, not the request body.
export async function POST(req: NextRequest) {
  try {
    const userId = await getUidFromRequest(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { wingId } = await req.json();
    if (!wingId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const result = await removeMemberWithSuccession(wingId, userId);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("Leave wing error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
