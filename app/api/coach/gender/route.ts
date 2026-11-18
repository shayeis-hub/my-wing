import { NextRequest, NextResponse } from "next/server";
import { admin, getAdminApp } from "@/lib/firebase/admin";
import { getUidFromRequest } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

/**
 * The dietitian tells us whether to address them as a man or a woman. Saved on
 * their profile, and copied onto their own entry in every wing they own so
 * their clients (who can read those wings, not this user doc) see
 * "הדיאטן" / "הדיאטנית".
 */
export async function POST(req: NextRequest) {
  const uid = await getUidFromRequest(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { gender } = (await req.json()) as { gender?: string };
    if (gender !== "male" && gender !== "female") return NextResponse.json({ error: "Bad gender" }, { status: 400 });

    getAdminApp();
    const db = admin.firestore();
    const userRef = db.doc(`users/${uid}`);
    const user = (await userRef.get()).data();
    if (user?.accountType !== "business") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await userRef.update({ "profile.gender": gender, "profile.genderSet": true });

    const wings = await db.collection("wings").where("ownerId", "==", uid).get();
    await Promise.all(
      wings.docs.map((w) => {
        const members: Record<string, unknown>[] = Array.isArray(w.data().members) ? w.data().members : [];
        if (!members.some((m) => m.uid === uid)) return null;
        return w.ref.update({ members: members.map((m) => (m.uid === uid ? { ...m, gender } : m)) });
      })
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("coach gender:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
