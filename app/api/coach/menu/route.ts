import { NextRequest, NextResponse } from "next/server";
import { admin, getAdminApp } from "@/lib/firebase/admin";
import { getUidFromRequest } from "@/lib/server/auth";
import { assertCoachOwnsClient, deleteClientMenu, MenuAuthError } from "@/lib/server/coachMenu";
import { sanitizeMenu } from "@/lib/coach/menu";

export const dynamic = "force-dynamic";

function fail(err: unknown) {
  if (err instanceof MenuAuthError) return NextResponse.json({ error: err.message }, { status: err.status });
  console.error("coach menu error:", err);
  return NextResponse.json({ error: "Failed" }, { status: 500 });
}

/** The coach's view of one client's menu: the draft being edited + what the client currently sees. */
export async function GET(req: NextRequest) {
  const uid = await getUidFromRequest(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const clientId = req.nextUrl.searchParams.get("clientId") ?? "";
    await assertCoachOwnsClient(uid, clientId);
    getAdminApp();
    const db = admin.firestore();
    const [draft, published] = await Promise.all([
      db.doc(`clientMenuDrafts/${clientId}`).get(),
      db.doc(`clientMenus/${clientId}`).get(),
    ]);
    const clientName = ((await db.doc(`users/${clientId}`).get()).data()?.displayName as string | undefined) ?? "";
    // Ignore leftovers from a previous coach of this client.
    const mine = (s: FirebaseFirestore.DocumentSnapshot) => (s.exists && s.data()?.coachId === uid ? s.data() : null);
    return NextResponse.json({ clientName, draft: mine(draft), published: mine(published) });
  } catch (err) {
    return fail(err);
  }
}

/** Saves the dietitian's edits to the draft. */
export async function PUT(req: NextRequest) {
  const uid = await getUidFromRequest(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { clientId, menu } = (await req.json()) as { clientId: string; menu: unknown };
    await assertCoachOwnsClient(uid, clientId);
    getAdminApp();
    const clean = sanitizeMenu(menu);
    await admin.firestore().doc(`clientMenuDrafts/${clientId}`).set(
      { clientId, coachId: uid, menu: clean, updatedAt: new Date().toISOString() },
      { merge: true }
    );
    return NextResponse.json({ ok: true, menu: clean });
  } catch (err) {
    return fail(err);
  }
}

/** Publishes the draft: copies it (minus the AI's "unclear" notes) to what the client sees. */
export async function POST(req: NextRequest) {
  const uid = await getUidFromRequest(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { clientId } = (await req.json()) as { clientId: string };
    const { coachName } = await assertCoachOwnsClient(uid, clientId);
    getAdminApp();
    const db = admin.firestore();
    const draft = await db.doc(`clientMenuDrafts/${clientId}`).get();
    if (!draft.exists || draft.data()?.coachId !== uid) {
      return NextResponse.json({ error: "No draft to publish" }, { status: 404 });
    }
    const menu = sanitizeMenu(draft.data()?.menu);
    if (menu.meals.length === 0) return NextResponse.json({ error: "EMPTY_MENU" }, { status: 400 });
    menu.unclear = [];
    await db.doc(`clientMenus/${clientId}`).set({
      clientId,
      coachId: uid,
      coachName,
      menu,
      publishedAt: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return fail(err);
  }
}

/** scope "draft" discards the draft only; "all" also withdraws the published menu and files. */
export async function DELETE(req: NextRequest) {
  const uid = await getUidFromRequest(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { clientId, scope } = (await req.json()) as { clientId: string; scope?: "draft" | "all" };
    await assertCoachOwnsClient(uid, clientId);
    getAdminApp();
    if (scope === "all") {
      await deleteClientMenu(uid, clientId);
    } else {
      await admin.firestore().doc(`clientMenuDrafts/${clientId}`).delete();
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
