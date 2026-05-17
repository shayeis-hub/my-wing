import { NextRequest, NextResponse } from "next/server";
import { createWing } from "@/lib/firebase/firestore";

export async function POST(req: NextRequest) {
  try {
    const { ownerId, ownerName, name } = await req.json();
    const wing = await createWing(ownerId, ownerName, name);
    return NextResponse.json(wing);
  } catch (err) {
    console.error("Create wing error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
