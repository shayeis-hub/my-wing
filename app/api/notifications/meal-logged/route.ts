import { NextRequest, NextResponse } from "next/server";
import { admin, getAdminApp } from "@/lib/firebase/admin";
import { getUidFromRequest } from "@/lib/server/auth";
import { clip, isWingMember, senderProfile, withinNotifyQuota } from "@/lib/server/notifyAuth";
import { g3 } from "@/lib/utils/gender";

export const dynamic = "force-dynamic";

// Fan-out: a wing member logged a meal → notify the other members who opted in.
// The author is the verified caller; a mealId is only used in the link if that
// meal really exists in the wing and belongs to the caller.
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

    getAdminApp();
    const db = admin.firestore();
    const recipients = memberIds.filter((id) => id && id !== uid);
    if (recipients.length === 0) return NextResponse.json({ ok: true, sent: 0 });

    const { name: authorName, gender } = await senderProfile(uid);
    const logged = g3(gender, "הזין", "הזינה", "הזין/ה");

    // Deep-link straight to the meal (scrolls + highlights it, where you can cheer).
    let link = `/member/${uid}`;
    const mealId = clip(body.mealId, 100);
    if (mealId) {
      const meal = await db.doc(`wings/${wingId}/meals/${mealId}`).get();
      if (meal.exists && meal.data()?.userId === uid) link = `/meals?meal=${mealId}`;
    }
    let sent = 0;

    await Promise.allSettled(
      recipients.map(async (rid) => {
        const data = (await db.doc(`users/${rid}`).get()).data();
        const token: string | undefined = data?.fcmToken;
        // Missing/undefined pref = opted in; only an explicit false silences it.
        if (!token || data?.notificationPrefs?.meals === false) return;
        // Per-member mute: skip if this recipient muted the author specifically.
        const muted: string[] = data?.notificationPrefs?.mealsMuted ?? [];
        if (muted.includes(uid)) return;

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
