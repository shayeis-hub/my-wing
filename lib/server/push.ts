import { admin, getAdminApp } from "@/lib/firebase/admin";

export type Gender = "male" | "female";

/** Read a user's gender (defaults to masculine if missing/unreadable). */
export async function getUserGender(userId: string): Promise<Gender> {
  try {
    const snap = await admin.firestore().doc(`users/${userId}`).get();
    return snap.data()?.profile?.gender === "female" ? "female" : "male";
  } catch {
    return "male";
  }
}

/**
 * Send a single push notification to one user. Best-effort: resolves to false
 * if the user has no token or the send fails (never throws).
 */
export async function sendUserPush(
  userId: string,
  opts: { title: string; body: string; link?: string; type?: string }
): Promise<boolean> {
  try {
    getAdminApp();
    const snap = await admin.firestore().doc(`users/${userId}`).get();
    const token = snap.data()?.fcmToken;
    if (!token) return false;

    const link = opts.link ?? "/wing";
    await admin.messaging().send({
      token,
      notification: { title: opts.title, body: opts.body },
      data: { link, type: opts.type ?? "" },
      android: { notification: { sound: "default", channelId: "default", priority: "high" } },
      apns: { payload: { aps: { sound: "default", badge: 1 } } },
      webpush: {
        notification: { icon: "/icons/icon-192.png", badge: "/icons/icon-192.png", dir: "rtl", lang: "he" },
        fcmOptions: { link },
      },
    });
    return true;
  } catch (err) {
    console.error("sendUserPush failed:", err);
    return false;
  }
}
