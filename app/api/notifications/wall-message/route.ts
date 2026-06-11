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

    // Persist the wall message
    await db.collection("wings").doc(wingId).collection("wallMessages").add({
      wingId,
      targetUserId,
      authorId,
      authorName,
      text: message,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Send push if the user has an FCM token
    const userSnap = await db.doc(`users/${targetUserId}`).get();
    const token = userSnap.data()?.fcmToken;
    if (token) {
      let authorGender: "male" | "female" = "male";
      if (authorId) {
        try {
          const authorSnap = await db.doc(`users/${authorId}`).get();
          if (authorSnap.data()?.profile?.gender === "female") authorGender = "female";
        } catch { /* ignore */ }
      }
      const verb = authorGender === "female" ? "כתבה לך על הקיר" : "כתב לך על הקיר";

      await admin.messaging().send({
        token,
        notification: { title: `${authorName} ${verb}`, body: message },
        data: { link: "/dashboard", type: "wall_message" },
        webpush: {
          notification: { icon: "/icons/icon-192.png", dir: "rtl", lang: "he" },
          fcmOptions: { link: "/dashboard" },
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
