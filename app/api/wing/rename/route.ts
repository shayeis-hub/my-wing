import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { renameWing } from "@/lib/firebase/firestore";

export async function POST(req: NextRequest) {
  try {
    const { wingId, name } = await req.json();
    if (!wingId || !name) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    await renameWing(wingId, name);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Rename wing error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
