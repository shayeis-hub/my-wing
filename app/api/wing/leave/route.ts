import { NextRequest, NextResponse } from "next/server";
import { removeMemberWithSuccession } from "@/lib/server/wingMembership";

export const dynamic = "force-dynamic";

// A member leaves the wing (also used during account deletion). Handles owner
// succession automatically.
export async function POST(req: NextRequest) {
  try {
    const { wingId, userId } = await req.json();
    if (!wingId || !userId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const result = await removeMemberWithSuccession(wingId, userId);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("Leave wing error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
