import { NextRequest, NextResponse } from "next/server";
import { admin, getAdminApp } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { wingId, targetUserId, authorId, authorName, message } = await req.json();
    if (!wingId || !targetUserId || !authorName || !message) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    getAdminApp();
    const db = admin.firestore();

    // The message itself is persisted client-side (firestore.rules permit it);
    // this endpoint only delivers the push notification.

    // Send push if the user has an FCM token
    const userSnap = await db.doc(`users/${targetUserId}`).get();
    const token = userSnap.data()?.fcmToken;
    // Respect the recipient's personal-message preference (undefined = opted in).
    if (token && userSnap.data()?.notificationPrefs?.personal !== false) {
      let authorGender: "male" | "female" = "male";
      if (authorId) {
        try {
          const authorSnap = await db.doc(`users/${authorId}`).get();
          if (authorSnap.data()?.profile?.gender === "female") authorGender = "female";
        } catch { /* ignore */ }
      }
      const verb = authorGender === "female" ? "כתבה לך על הקיר" : "כתב לך על הקיר";
      // The message lives on the RECIPIENT's wall (targetUserId), so open their
      // own member page — not the author's — where the new message is shown.
      const link = `/member/${targetUserId}`;

      await admin.messaging().send({
        token,
        notification: { title: `${authorName} ${verb}`, body: message },
        data: { link, type: "wall_message" },
        webpush: {
          notification: { icon: "/icons/icon-192.png", dir: "rtl", lang: "he" },
          fcmOptions: { link },
        },
        apns: { payload: { aps: { sound: "default" } } },
        android: { notification: { sound: "default" } },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Wall message error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
