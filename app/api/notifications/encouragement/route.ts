import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";

import { admin, getAdminApp } from "@/lib/firebase/admin";

export async function POST(req: NextRequest) {
  try {
    const { targetUserId, authorId, authorName, message, link } = await req.json();
    if (!targetUserId || !authorName || !message) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    getAdminApp();
    const userSnap = await admin.firestore().doc(`users/${targetUserId}`).get();
    if (!userSnap.exists) return NextResponse.json({ ok: true });

    const token = userSnap.data()?.fcmToken;
    if (!token) return NextResponse.json({ ok: true });

    // Gender the verb after the author's name ("עודד" / "עודדה").
    let authorGender: "male" | "female" = "male";
    if (typeof authorId === "string" && authorId) {
      try {
        const authorSnap = await admin.firestore().doc(`users/${authorId}`).get();
        if (authorSnap.data()?.profile?.gender === "female") authorGender = "female";
      } catch { /* gender lookup failed — default masculine */ }
    }
    const encouraged = authorGender === "female" ? "עודדה" : "עודד";

    // Caller can specify which page to open. Defaults to /checkin for back-compat.
    const targetLink = typeof link === "string" && link.startsWith("/") ? link : "/checkin";
    await admin.messaging().send({
      token,
      notification: {
        title: `💪 ${authorName} ${encouraged} אותך!`,
        body: message,
      },
      // data.link is read by the native app (Capacitor) on notification tap
      data: { link: targetLink, type: "encouragement" },
      webpush: {
        notification: { icon: "/icons/icon-192.png", dir: "rtl", lang: "he" },
        fcmOptions: { link: targetLink },
      },
      apns: { payload: { aps: { sound: "default" } } },
      android: { notification: { sound: "default" } },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Encouragement notification error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
