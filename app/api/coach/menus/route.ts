import { NextRequest, NextResponse } from "next/server";
import { admin, getAdminApp } from "@/lib/firebase/admin";
import { getUidFromRequest } from "@/lib/server/auth";
import { isCoachActive } from "@/lib/subscription";
import type { MenuOverviewRow } from "@/lib/coach/menu";

export const dynamic = "force-dynamic";

/** One row per client of the dietitian: does the client have a menu, a draft, or nothing. */
export async function GET(req: NextRequest) {
  const uid = await getUidFromRequest(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  getAdminApp();
  const db = admin.firestore();
  const coachData = (await db.doc(`users/${uid}`).get()).data() ?? {};
  if (!(coachData.accountType === "business" && isCoachActive(coachData.coach))) {
    return NextResponse.json({ error: "Coach plan inactive" }, { status: 403 });
  }

  const wings = await db.collection("wings").where("ownerId", "==", uid).get();
  const clients = new Map<string, { displayName?: string; photoURL?: string }>();
  for (const w of wings.docs) {
    const members: { uid: string; displayName?: string; photoURL?: string }[] = Array.isArray(w.data().members) ? w.data().members : [];
    for (const m of members) if (m.uid !== uid && !clients.has(m.uid)) clients.set(m.uid, m);
  }
  const ids = [...clients.keys()];
  if (ids.length === 0) return NextResponse.json({ rows: [] as MenuOverviewRow[] });

  const [pubSnaps, draftSnaps] = await Promise.all([
    db.getAll(...ids.map((id) => db.doc(`clientMenus/${id}`))),
    db.getAll(...ids.map((id) => db.doc(`clientMenuDrafts/${id}`))),
  ]);
  const mine = (s: FirebaseFirestore.DocumentSnapshot) => (s.exists && s.data()?.coachId === uid ? s.data()! : null);

  const rows: MenuOverviewRow[] = ids.map((id, i) => {
    const pub = mine(pubSnaps[i]);
    const draft = mine(draftSnaps[i]);
    return {
      uid: id,
      displayName: clients.get(id)?.displayName ?? "",
      photoURL: clients.get(id)?.photoURL,
      published: !!pub,
      publishedAt: (pub?.publishedAt as string | undefined) ?? null,
      hasDraft: !!draft,
      draftUpdatedAt: (draft?.updatedAt as string | undefined) ?? null,
    };
  });
  // Clients with nothing first, then drafts waiting to be published, then the rest.
  const rank = (r: MenuOverviewRow) => (!r.published && !r.hasDraft ? 0 : r.hasDraft && (!r.published || (r.draftUpdatedAt ?? "") > (r.publishedAt ?? "")) ? 1 : 2);
  rows.sort((a, b) => rank(a) - rank(b) || a.displayName.localeCompare(b.displayName, "he"));
  return NextResponse.json({ rows });
}
