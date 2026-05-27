import { NextRequest, NextResponse } from "next/server";
import { admin, getAdminApp } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

interface ContactPayload {
  name: string;
  email: string;
  subject: "bug" | "idea" | "other";
  message: string;
  userId?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ContactPayload;
    if (!body.name?.trim() || !body.email?.trim() || !body.message?.trim()) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    if (!["bug", "idea", "other"].includes(body.subject)) {
      return NextResponse.json({ error: "Invalid subject" }, { status: 400 });
    }

    getAdminApp();
    const db = admin.firestore();
    await db.collection("contact_submissions").add({
      name: body.name.trim(),
      email: body.email.trim(),
      subject: body.subject,
      message: body.message.trim(),
      userId: body.userId ?? null,
      createdAt: new Date().toISOString(),
      status: "new",
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Contact submission error:", err);
    return NextResponse.json({ error: "Failed to submit" }, { status: 500 });
  }
}
