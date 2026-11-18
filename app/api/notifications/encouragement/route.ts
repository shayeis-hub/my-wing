import { NextRequest, NextResponse } from "next/server";
import { admin, getAdminApp } from "@/lib/firebase/admin";
import { getUidFromRequest } from "@/lib/server/auth";
import { clip, safeLink, senderProfile, shareAWing, withinNotifyQuota } from "@/lib/server/notifyAuth";
import { g3 } from "@/lib/utils/gender";

export const dynamic = "force-dynamic";

// Push for an encouragement / comment. The sender is the verified caller (name and
// gender from their own profile), and must share a wing with the recipient.
export async function POST(req: NextRequest) {
  const uid = await getUidFromRequest(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const targetUserId = clip(body.targetUserId, 128);
    const message = clip(body.message, 300);
    if (!targetUserId || !message) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    // Replying on your own post/meal sends no push.
    if (targetUserId === uid) return NextResponse.json({ ok: true });
    if (!(await shareAWing(uid, targetUserId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (!(await withinNotifyQuota(uid))) return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });

    getAdminApp();
    const userSnap = await admin.firestore().doc(`users/${targetUserId}`).get();
    if (!userSnap.exists) return NextResponse.json({ ok: true });

    const token = userSnap.data()?.fcmToken;
    if (!token) return NextResponse.json({ ok: true });
    // Respect the recipient's personal-message preference (undefined = opted in).
    if (userSnap.data()?.notificationPrefs?.personal === false) return NextResponse.json({ ok: true });

    const { name: authorName, gender } = await senderProfile(uid);
    const encouraged = g3(gender, "עודד", "עודדה", "עודד/ה");

    // Caller can specify which in-app page to open (relative paths only). Defaults to /checkin.
    const targetLink = safeLink(body.link, "/checkin");
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
