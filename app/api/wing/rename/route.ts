import { NextRequest, NextResponse } from "next/server";
import { admin, getAdminApp } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { wingId, name } = await req.json();
    if (!wingId || !name) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    getAdminApp();
    await admin.firestore().collection("wings").doc(wingId).update({ name });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Rename wing error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
