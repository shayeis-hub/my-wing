import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";

import { admin, getAdminApp } from "@/lib/firebase/admin";

export async function POST(req: NextRequest) {
  try {
    const { wingId, userId, userName } = await req.json();

    getAdminApp();
    const wingSnap = await admin.firestore().doc(`wings/${wingId}`).get();
    if (!wingSnap.exists) {
      return NextResponse.json({ error: "Wing not found" }, { status: 404 });
    }

    const memberIds: string[] = ((wingSnap.data()?.memberIds ?? []) as string[]).filter(
      (id) => id !== userId
    );

    const tokens: string[] = [];
    for (const memberId of memberIds) {
      const userSnap = await admin.firestore().doc(`users/${memberId}`).get();
      if (userSnap.exists) {
        const token = userSnap.data()?.fcmToken;
        if (token) tokens.push(token);
      }
    }

    if (tokens.length === 0) {
      return NextResponse.json({ success: true, notified: 0 });
    }
    const results = await Promise.allSettled(
      tokens.map((token) =>
        admin.messaging().send({
          token,
          notification: {
            title: "SOS – צריך תמיכה! 🆘",
            body: `${userName} זקוק/ה לחיזוק עכשיו. היכנסו לאפליקציה 💪`,
          },
          android: { notification: { sound: "default", channelId: "sos", priority: "high" } },
          apns: { payload: { aps: { sound: "default", badge: 1 } } },
          webpush: {
            notification: { icon: "/icons/icon-192.png", badge: "/icons/icon-192.png", dir: "rtl", lang: "he" },
            fcmOptions: { link: "/wing" },
          },
        })
      )
    );

    const notified = results.filter((r) => r.status === "fulfilled").length;
    return NextResponse.json({ success: true, notified });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("SOS notification error:", msg, err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
