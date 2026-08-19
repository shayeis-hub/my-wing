import { NextRequest, NextResponse } from "next/server";
import { getUidFromRequest } from "@/lib/server/auth";
import { purgeUserData } from "@/lib/server/accountCleanup";

export const dynamic = "force-dynamic";

// Purges a user's wing-scoped data (checkins, weightLogs, steps, meals,
// posts, wallMessages, authored comments/reactions, dailyUsage) as the first
// step of account deletion. The client deletes the users/{uid} doc and the
// Auth user itself right after this succeeds.
export async function POST(req: NextRequest) {
  try {
    const uid = await getUidFromRequest(req);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await purgeUserData(uid);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Account data purge error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
