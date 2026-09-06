import { NextRequest, NextResponse } from "next/server";
import { admin, getAdminApp } from "@/lib/firebase/admin";
import { requireAdminSecret } from "@/lib/fitDadAdmin";

export const dynamic = "force-dynamic";

// Lists every fitDad account for the admin panel's "expiring soon" report.
// Sorted in JS rather than an orderBy query — a where().orderBy() on
// different fields needs a composite index that may not exist yet, and this
// collection is small enough that fetching-then-sorting is simpler and
// avoids that trap entirely (see feedback_firestore_index in memory).
export async function GET(req: NextRequest) {
  const authError = requireAdminSecret(req);
  if (authError) return authError;

  try {
    getAdminApp();
    const db = admin.firestore();
    const snap = await db.collection("users").where("fitDadAccess.active", "==", true).get();

    const users = snap.docs
      .map((d) => {
        const data = d.data();
        return {
          uid: d.id,
          displayName: data.displayName ?? "—",
          email: data.email ?? "—",
          wingId: data.wingId ?? null,
          plan: data.fitDadAccess?.plan ?? null,
          expiresAt: data.fitDadAccess?.expiresAt ?? null,
          createdBy: data.fitDadAccess?.createdBy ?? null,
          mustChangePassword: !!data.mustChangePassword,
        };
      })
      .sort((a, b) => {
        const ta = a.expiresAt ? new Date(a.expiresAt).getTime() : Infinity;
        const tb = b.expiresAt ? new Date(b.expiresAt).getTime() : Infinity;
        return ta - tb; // soonest-expiring first
      });

    return NextResponse.json({ users });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("fitdad users list error:", msg);
    return NextResponse.json({ error: "Failed", detail: msg }, { status: 500 });
  }
}
