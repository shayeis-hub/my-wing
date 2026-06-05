import { Capacitor } from "@capacitor/core";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

let registered = false;

/**
 * Registers the native app for FCM push notifications (Android/iOS).
 * Stores the native FCM token in users/{uid}.fcmToken and wires tap-to-navigate.
 * No-op on web/PWA (the existing web-push flow handles that).
 *
 * @param userId   Firebase auth uid to attach the token to.
 * @param navigate Called with an in-app path when a notification is tapped.
 */
export async function registerNativePush(
  userId: string,
  navigate: (path: string) => void
): Promise<void> {
  if (!Capacitor.isNativePlatform() || registered) return;
  registered = true;

  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");

    // Save the FCM token once the OS issues it.
    await PushNotifications.addListener("registration", async (token) => {
      try {
        await updateDoc(doc(db, "users", userId), { fcmToken: token.value });
      } catch {
        /* token save failed — non-critical, will retry next launch */
      }
    });

    await PushNotifications.addListener("registrationError", () => {
      registered = false; // allow a retry on a later launch
    });

    // Tapping a notification → navigate to the page it points at.
    await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      const link = action.notification?.data?.link;
      if (typeof link === "string" && link.startsWith("/")) {
        navigate(link);
      }
    });

    // Ask permission, then register with FCM.
    let perm = await PushNotifications.checkPermissions();
    if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale") {
      perm = await PushNotifications.requestPermissions();
    }
    if (perm.receive !== "granted") {
      registered = false;
      return;
    }

    // Android: ensure the high-priority "sos" channel exists (referenced by the SOS API route).
    if (Capacitor.getPlatform() === "android") {
      try {
        await PushNotifications.createChannel({
          id: "sos",
          name: "SOS",
          description: "התראות תמיכה דחופות",
          importance: 5,
          sound: "default",
          vibration: true,
        });
      } catch {
        /* channel creation unsupported — non-critical */
      }
    }

    await PushNotifications.register();
  } catch {
    registered = false;
  }
}
