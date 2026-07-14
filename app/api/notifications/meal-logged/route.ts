import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";

import { admin, getAdminApp } from "@/lib/firebase/admin";

// Fan-out: a wing member logged a meal → notify the other members who opted in.
export async function POST(req: NextRequest) {
  try {
    const { wingId, authorId, authorName, mealId } = await req.json();
    if (!wingId || !authorId || !authorName) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    getAdminApp();
    const db = admin.firestore();

    const wingSnap = await db.doc(`wings/${wingId}`).get();
    if (!wingSnap.exists) return NextResponse.json({ ok: true });
    const memberIds: string[] = wingSnap.data()?.memberIds ?? [];

    // Everyone except the author.
    const recipients = memberIds.filter((id) => id && id !== authorId);
    if (recipients.length === 0) return NextResponse.json({ ok: true, sent: 0 });

    // Gender the verb after the author's name ("הזין" / "הזינה").
    let authorGender: "male" | "female" = "male";
    try {
      const authorSnap = await db.doc(`users/${authorId}`).get();
      if (authorSnap.data()?.profile?.gender === "female") authorGender = "female";
    } catch { /* default masculine */ }
    const logged = authorGender === "female" ? "הזינה" : "הזין";

    // Deep-link straight to the meal (scrolls + highlights it, where you can cheer).
    // Fall back to the member's page if we somehow don't have the meal id.
    const link = typeof mealId === "string" && mealId ? `/meals?meal=${mealId}` : `/member/${authorId}`;
    let sent = 0;

    await Promise.allSettled(
      recipients.map(async (uid) => {
        const snap = await db.doc(`users/${uid}`).get();
        const data = snap.data();
        const token: string | undefined = data?.fcmToken;
        // Missing/undefined pref = opted in; only an explicit false silences it.
        if (!token || data?.notificationPrefs?.meals === false) return;
        // Per-member mute: skip if this recipient muted the author specifically.
        const muted: string[] = data?.notificationPrefs?.mealsMuted ?? [];
        if (muted.includes(authorId)) return;

        try {
          await admin.messaging().send({
            token,
            notification: { title: `🍽️ ${authorName} ${logged} ארוחה`, body: "רוצה לפרגן? 💛" },
            data: { link, type: "meal_logged" },
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
    console.error("Meal-logged notification error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
