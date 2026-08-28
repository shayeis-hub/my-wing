import { NextRequest, NextResponse } from "next/server";
import { admin, getAdminApp } from "@/lib/firebase/admin";
import { getUidFromRequest } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

// A single fixed code printed in the book itself (not a per-purchase code —
// Amazon gives no purchase API to validate against). Kept in an env var
// rather than hardcoded so it can be rotated without a code deploy if it
// ever leaks widely. See project_book_companion_app memory for the tradeoffs.
export async function POST(req: NextRequest) {
  const uid = await getUidFromRequest(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const expected = process.env.BOOK_REDEMPTION_CODE;
  if (!expected) {
    console.error("BOOK_REDEMPTION_CODE not set");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const { code } = (await req.json()) as { code?: string };
  if (!code || code.trim().toUpperCase() !== expected.trim().toUpperCase()) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  getAdminApp();
  const db = admin.firestore();
  const userRef = db.doc(`users/${uid}`);

  const existing = (await userRef.get()).data()?.bookAccess;
  if (existing?.active) {
    // Already redeemed — not an error, just a no-op so the redeem screen
    // can safely be hit twice (e.g. a retry after a flaky network call).
    return NextResponse.json({ ok: true, alreadyActive: true });
  }

  await userRef.set(
    { bookAccess: { active: true, redeemedAt: new Date().toISOString() } },
    { merge: true }
  );

  return NextResponse.json({ ok: true });
}
