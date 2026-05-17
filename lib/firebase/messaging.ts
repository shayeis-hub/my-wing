import { getToken, onMessage } from "firebase/messaging";
import { doc, updateDoc } from "firebase/firestore";
import { getMessagingInstance, db } from "./config";

export async function requestNotificationPermission(
  userId: string
): Promise<string | null> {
  const messaging = await getMessagingInstance();
  if (!messaging) return null;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  const token = await getToken(messaging, {
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
  });

  if (token) {
    await updateDoc(doc(db, "users", userId), { fcmToken: token });
  }
  return token;
}

export async function onForegroundMessage(
  callback: (payload: { title: string; body: string }) => void
) {
  const messaging = await getMessagingInstance();
  if (!messaging) return;
  onMessage(messaging, (payload) => {
    callback({
      title: payload.notification?.title ?? "",
      body: payload.notification?.body ?? "",
    });
  });
}
