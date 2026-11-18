import { NextRequest, NextResponse } from "next/server";
import { admin, getAdminApp } from "@/lib/firebase/admin";
import { getUidFromRequest } from "@/lib/server/auth";
import { clip, isWingMember, senderProfile, withinNotifyQuota } from "@/lib/server/notifyAuth";

export const dynamic = "force-dynamic";

// Push for a wall message. The sender is the verified caller (name and gender come
// from their own profile), and both sender and recipient must be members of the wing.
export async function POST(req: NextRequest) {
  const uid = await getUidFromRequest(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const wingId = clip(body.wingId, 100);
    const targetUserId = clip(body.targetUserId, 128);
    const message = clip(body.message, 300);
    if (!wingId || !targetUserId || !message) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const { ok, memberIds } = await isWingMember(wingId, uid);
    if (!ok || !memberIds.includes(targetUserId) || targetUserId === uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!(await withinNotifyQuota(uid))) return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });

    getAdminApp();
    const db = admin.firestore();
    // The message itself is persisted client-side (firestore.rules permit it);
    // this endpoint only delivers the push notification.
    const userSnap = await db.doc(`users/${targetUserId}`).get();
    const token = userSnap.data()?.fcmToken;
    // Respect the recipient's personal-message preference (undefined = opted in).
    if (token && userSnap.data()?.notificationPrefs?.personal !== false) {
      const { name: authorName, gender } = await senderProfile(uid);
      const verb = gender === "female" ? "כתבה לך על הקיר" : "כתב לך על הקיר";
      // The message lives on the RECIPIENT's wall, so open their own member page.
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
