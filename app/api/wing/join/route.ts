import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { joinWing } from "@/lib/firebase/firestore";

export async function POST(req: NextRequest) {
  try {
    const { token, userId, displayName, photoURL } = await req.json();
    const wing = await joinWing(token, userId, displayName, photoURL);
    if (!wing) {
      return NextResponse.json({ error: "Invalid invite token" }, { status: 404 });
    }
    return NextResponse.json(wing);
  } catch (err) {
    console.error("Join wing error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
