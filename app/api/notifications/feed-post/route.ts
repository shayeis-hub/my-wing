import { NextRequest, NextResponse } from "next/server";
import { admin, getAdminApp } from "@/lib/firebase/admin";
import { getUidFromRequest } from "@/lib/server/auth";
import { clip, isWingMember, senderProfile, withinNotifyQuota } from "@/lib/server/notifyAuth";

export const dynamic = "force-dynamic";

// Fan-out: a wing member posted to the feed → notify the other members who opted in.
// The author is the verified caller and must be a member of the wing.
export async function POST(req: NextRequest) {
  const uid = await getUidFromRequest(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const wingId = clip(body.wingId, 100);
    if (!wingId) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const { ok, memberIds } = await isWingMember(wingId, uid);
    if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (!(await withinNotifyQuota(uid))) return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });

    const recipients = memberIds.filter((id) => id && id !== uid);
    if (recipients.length === 0) return NextResponse.json({ ok: true, sent: 0 });

    getAdminApp();
    const db = admin.firestore();
    const { name: authorName, gender } = await senderProfile(uid);
    const wrote = gender === "female" ? "כתבה בפיד" : "כתב בפיד";

    const preview = clip(body.preview, 200);
    const text = preview ? (preview.length > 80 ? preview.slice(0, 80) + "…" : preview) : "פוסט חדש במבנה שלך";
    const link = "/feed";
    let sent = 0;

    await Promise.allSettled(
      recipients.map(async (rid) => {
        const data = (await db.doc(`users/${rid}`).get()).data();
        const token: string | undefined = data?.fcmToken;
        if (!token || data?.notificationPrefs?.feed === false) return;

        try {
          await admin.messaging().send({
            token,
            notification: { title: `📝 ${authorName} ${wrote}`, body: text },
            data: { link, type: "feed_post" },
            webpush: {
              notification: { icon: "/icons/icon-192.png", dir: "rtl", lang: "he" },
              fcmOptions: { link },
            },
            apns: { payload: { aps: { sound: "default" } } },
            android: { notification: { sound: "default" } },
          });
          sent++;
        } catch { /* invalid token — non-critical */ }
      })
    );

    return NextResponse.json({ ok: true, sent });
  } catch (err) {
    console.error("Feed-post notification error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
