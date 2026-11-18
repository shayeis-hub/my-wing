import { NextRequest, NextResponse } from "next/server";
import { admin, getAdminApp } from "@/lib/firebase/admin";
import { getUidFromRequest } from "@/lib/server/auth";
import { assertCoachOwnsClient, MenuAuthError, storageBucket } from "@/lib/server/coachMenu";
import { extractMenu } from "@/lib/ai/menuExtract";
import { MENU_ACCEPTED_TYPES, MENU_FILE_MAX_BYTES, type MenuSource } from "@/lib/coach/menu";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DAILY_EXTRACTIONS = 30;

/**
 * Turns an uploaded menu file (already in Storage at menus/{coach}/{client}/…)
 * into a structured DRAFT for the dietitian to review. Nothing reaches the
 * client until the dietitian publishes it.
 */
export async function POST(req: NextRequest) {
  const uid = await getUidFromRequest(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { clientId, storagePath, fileName } = (await req.json()) as {
      clientId: string;
      storagePath: string;
      fileName?: string;
    };
    await assertCoachOwnsClient(uid, clientId);
    if (typeof storagePath !== "string" || !storagePath.startsWith(`menus/${uid}/${clientId}/`) || storagePath.includes("..")) {
      return NextResponse.json({ error: "Bad path" }, { status: 400 });
    }

    getAdminApp();
    const db = admin.firestore();

    // Light per-day cap — each extraction is a paid AI call.
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date());
    const usageRef = db.doc(`users/${uid}/dailyUsage/${today}`);
    const used = ((await usageRef.get()).data()?.menuExtractions as number | undefined) ?? 0;
    if (used >= DAILY_EXTRACTIONS) return NextResponse.json({ error: "DAILY_LIMIT" }, { status: 429 });

    const file = storageBucket().file(storagePath);
    const [exists] = await file.exists();
    if (!exists) return NextResponse.json({ error: "File not found" }, { status: 404 });
    const [meta] = await file.getMetadata();
    const contentType = String(meta.contentType ?? "");
    const size = Number(meta.size ?? 0);
    if (!MENU_ACCEPTED_TYPES.includes(contentType)) return NextResponse.json({ error: "UNSUPPORTED_TYPE" }, { status: 400 });
    if (size > MENU_FILE_MAX_BYTES) return NextResponse.json({ error: "TOO_LARGE" }, { status: 400 });

    const [buf] = await file.download();
    await usageRef.set({ menuExtractions: admin.firestore.FieldValue.increment(1), date: today }, { merge: true });

    let menu;
    try {
      menu = await extractMenu(buf.toString("base64"), contentType);
    } catch (err) {
      await usageRef.set({ menuExtractions: admin.firestore.FieldValue.increment(-1) }, { merge: true }).catch(() => {});
      console.error("menu extraction:", err);
      return NextResponse.json({ error: "EXTRACTION_FAILED" }, { status: 502 });
    }

    const source: MenuSource = {
      path: storagePath,
      name: String(fileName ?? "").slice(0, 120),
      contentType,
      size,
    };
    await db.doc(`clientMenuDrafts/${clientId}`).set({
      clientId,
      coachId: uid,
      menu,
      source,
      updatedAt: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true, menu });
  } catch (err) {
    if (err instanceof MenuAuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("menu extract route:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
