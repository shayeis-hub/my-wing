import { Capacitor } from "@capacitor/core";

/**
 * True when running inside the native (Capacitor) app rather than a browser.
 * Used to hide in-app digital purchases on Android/iOS — Google Play / App
 * Store require their own billing for in-app digital goods, so we route
 * upgrades to the web instead.
 */
export function isNativeApp(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}
