import { NextRequest, NextResponse } from "next/server";
import { admin, getAdminApp } from "@/lib/firebase/admin";
import { getUidFromRequest } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

// Called once, from book onboarding, to start habit 1. Marking a habit
// "installed" (which starts the next one) is a separate route —
// app/api/book/mark-installed/route.ts.
export async function POST(req: NextRequest) {
  const uid = await getUidFromRequest(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { habitId } = (await req.json()) as { habitId?: string };
  if (!habitId) return NextResponse.json({ error: "Missing habitId" }, { status: 400 });

  getAdminApp();
  const db = admin.firestore();
  const userRef = db.doc(`users/${uid}`);
  const existing = (await userRef.get()).data()?.habitProgress ?? {};

  if (existing[habitId]) {
    return NextResponse.json({ ok: true }); // already started — no-op
  }

  await userRef.set(
    { habitProgress: { [habitId]: { startedAt: new Date().toISOString() } } },
    { merge: true }
  );

  return NextResponse.json({ ok: true });
}
