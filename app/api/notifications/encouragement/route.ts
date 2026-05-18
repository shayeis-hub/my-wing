import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";

import { admin, getAdminApp } from "@/lib/firebase/admin";

export async function POST(req: NextRequest) {
  try {
    const { targetUserId, authorName, message } = await req.json();
    if (!targetUserId || !authorName || !message) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    getAdminApp();
    const userSnap = await admin.firestore().doc(`users/${targetUserId}`).get();
    if (!userSnap.exists) return NextResponse.json({ ok: true });

    const token = userSnap.data()?.fcmToken;
    if (!token) return NextResponse.json({ ok: true });
    await admin.messaging().send({
      token,
      notification: {
        title: `💪 ${authorName} עודד/ה אותך!`,
        body: message,
      },
      webpush: {
        notification: { icon: "/icons/icon-192.png", dir: "rtl", lang: "he" },
        fcmOptions: { link: "/checkin" },
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
