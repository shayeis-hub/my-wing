import { NextRequest, NextResponse } from "next/server";
import { admin, getAdminApp } from "@/lib/firebase/admin";
import { requireAdminSecret } from "@/lib/fitDadAdmin";
import { FIT_DAD_WING_MAX_MEMBERS } from "@/lib/subscription";

export const dynamic = "force-dynamic";

// GET — every fitDad wing (private + public), for the admin panel's pool
// overview and the "join an existing wing" picker in create-user/bulk-import.
export async function GET(req: NextRequest) {
  const authError = requireAdminSecret(req);
  if (authError) return authError;

  try {
    getAdminApp();
    const db = admin.firestore();
    const snap = await db.collection("wings").where("isFitDadWing", "==", true).get();
    const wings = snap.docs.map((d) => {
      const data = d.data();
      const memberIds: string[] = Array.isArray(data.memberIds) ? data.memberIds : [];
      return {
        id: d.id,
        name: data.name ?? "—",
        visibility: data.visibility === "public" ? "public" : "private",
        memberCount: memberIds.length,
        capacity: typeof data.capacity === "number" ? data.capacity : FIT_DAD_WING_MAX_MEMBERS,
      };
    });
    return NextResponse.json({ wings });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("fitdad wings list error:", msg);
    return NextResponse.json({ error: "Failed", detail: msg }, { status: 500 });
  }
}

// POST — pre-create one or more public pool wings for the onboarding picker
// (step 3 of the plan). No owner in the usual sense — memberIds starts
// empty, ownerId "" (the join route already falls back gracefully when a
// wing's owner doc doesn't resolve, same as it does for any stale ownerId).
export async function POST(req: NextRequest) {
  const authError = requireAdminSecret(req);
  if (authError) return authError;

  try {
    const { wings, createdBy } = (await req.json()) as {
      wings: { name: string; capacity?: number }[];
      createdBy?: string;
    };
    if (!createdBy?.trim()) {
      return NextResponse.json({ error: "MISSING_CREATED_BY" }, { status: 400 });
    }
    if (!Array.isArray(wings) || wings.length === 0) {
      return NextResponse.json({ error: "No wings" }, { status: 400 });
    }

    getAdminApp();
    const db = admin.firestore();
    const created: string[] = [];
    for (const w of wings) {
      if (!w.name?.trim()) continue;
      const ref = db.collection("wings").doc();
      await ref.set({
        name: w.name.trim(),
        ownerId: "",
        memberIds: [],
        members: [],
        inviteToken: "", // public pool wings are joined by picking from a list, not a link
        isFitDadWing: true,
        visibility: "public",
        capacity: typeof w.capacity === "number" && w.capacity > 0 ? w.capacity : FIT_DAD_WING_MAX_MEMBERS,
        fitDadCreatedBy: createdBy.trim(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      created.push(ref.id);
    }

    return NextResponse.json({ created });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("fitdad wings create error:", msg);
    return NextResponse.json({ error: "Failed", detail: msg }, { status: 500 });
  }
}
