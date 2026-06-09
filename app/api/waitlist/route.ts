import { NextRequest, NextResponse } from "next/server";
import { admin, getAdminApp } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { email, name } = await req.json() as { email?: string; name?: string };
    const emailTrimmed = email?.trim().toLowerCase();

    if (!emailTrimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      return NextResponse.json({ error: "כתובת מייל לא תקינה" }, { status: 400 });
    }

    getAdminApp();
    const db = admin.firestore();

    // Upsert by email — prevent duplicates
    const existing = await db
      .collection("waitlist")
      .where("email", "==", emailTrimmed)
      .limit(1)
      .get();

    if (!existing.empty) {
      return NextResponse.json({ ok: true, alreadyRegistered: true });
    }

    await db.collection("waitlist").add({
      email: emailTrimmed,
      name: name?.trim() || null,
      source: "course_landing",
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, alreadyRegistered: false });
  } catch (err) {
    console.error("Waitlist error:", err);
    return NextResponse.json({ error: "שגיאה בשמירה" }, { status: 500 });
  }
}
