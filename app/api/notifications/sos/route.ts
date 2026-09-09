import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";

import { admin, getAdminApp } from "@/lib/firebase/admin";
import { getUidFromRequest } from "@/lib/server/auth";

export async function POST(req: NextRequest) {
  // `userId`/`userName` used to be trusted straight from the request body —
  // anyone who knew (or guessed) a wingId could blast that wing's members
  // with a fake SOS push claiming to be sent by anyone, with no check that
  // the sender was even a member (found via QA, 2026-09). The verified
  // token's uid and the sender's OWN displayName (looked up server-side,
  // below) are now the only sources of truth for who's sending.
  const uid = await getUidFromRequest(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { wingId } = await req.json();
    const userId = uid;

    getAdminApp();

    let wingSnap;
    try {
      wingSnap = await admin.firestore().doc(`wings/${wingId}`).get();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ error: `Firestore wings read failed: ${msg}` }, { status: 500 });
    }

    if (!wingSnap.exists) {
      return NextResponse.json({ error: "Wing not found" }, { status: 404 });
    }

    const allMemberIds: string[] = (wingSnap.data()?.memberIds ?? []) as string[];
    if (!allMemberIds.includes(userId)) {
      return NextResponse.json({ error: "Not a member of this wing" }, { status: 403 });
    }
    const memberIds = allMemberIds.filter((id) => id !== userId);

    // Sender's real name and gendered wording ("זקוק" / "זקוקה") — looked up
    // server-side rather than trusted from the body.
    let userName = "מישהו מהכנף";
    let senderGender: "male" | "female" = "male";
    try {
      const senderSnap = await admin.firestore().doc(`users/${userId}`).get();
      const senderData = senderSnap.data();
      if (senderData?.displayName) userName = senderData.displayName;
      if (senderData?.profile?.gender === "female") senderGender = "female";
    } catch { /* lookup failed — fall back to generic name/masculine wording */ }
    const needsWord = senderGender === "female" ? "זקוקה" : "זקוק";

    const tokens: string[] = [];
    for (const memberId of memberIds) {
      try {
        const userSnap = await admin.firestore().doc(`users/${memberId}`).get();
        if (userSnap.exists) {
          const token = userSnap.data()?.fcmToken;
          if (token) tokens.push(token);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ error: `Firestore users read failed for ${memberId}: ${msg}` }, { status: 500 });
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
            body: `${userName} ${needsWord} לחיזוק עכשיו. היכנסו לאפליקציה 💪`,
          },
          // data.link is read by the native app (Capacitor) on notification tap
          data: { link: "/wing", type: "sos", senderId: String(userId ?? "") },
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
    const errors = results
      .filter((r): r is PromiseRejectedResult => r.status === "rejected")
      .map((r) => (r.reason instanceof Error ? r.reason.message : String(r.reason)));
    if (errors.length > 0) {
      console.error("SOS send errors:", errors);
    }
    return NextResponse.json({ success: true, notified, errors });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("SOS notification error:", msg, err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
