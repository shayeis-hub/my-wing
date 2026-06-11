import { NextRequest, NextResponse } from "next/server";
import { admin, getAdminApp } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

const COURSE_WEEKS = 8;

export async function POST(req: NextRequest) {
  // Verify shared secret
  const secret = req.headers.get("x-course-secret");
  if (!secret || secret !== process.env.COURSE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { email, wingId, courseStartDate } = await req.json() as {
      email?: string;
      wingId?: string;
      courseStartDate?: string; // ISO date string, e.g. "2026-06-15"
    };

    if (!email?.trim() || !wingId?.trim() || !courseStartDate?.trim()) {
      return NextResponse.json({ error: "Missing email, wingId or courseStartDate" }, { status: 400 });
    }

    getAdminApp();
    const db = admin.firestore();

    // Find user by email
    const usersSnap = await db.collection("users").where("email", "==", email.trim().toLowerCase()).limit(1).get();
    if (usersSnap.empty) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userDoc = usersSnap.docs[0];

    // Calculate expiry: courseStartDate + 8 weeks
    const startDate = new Date(courseStartDate);
    if (isNaN(startDate.getTime())) {
      return NextResponse.json({ error: "Invalid courseStartDate" }, { status: 400 });
    }
    const expiresAt = new Date(startDate);
    expiresAt.setDate(expiresAt.getDate() + COURSE_WEEKS * 7);

    await userDoc.ref.update({
      courseAccess: {
        expiresAt: expiresAt.toISOString(),
        wingId: wingId.trim(),
      },
    });

    return NextResponse.json({
      ok: true,
      uid: userDoc.id,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (err) {
    console.error("Course enroll error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
