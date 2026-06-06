import { Capacitor, registerPlugin } from "@capacitor/core";

/** Native bridge (Android): tells the home-screen widget to re-read its data. */
const WidgetBridge = registerPlugin<{ refresh(): Promise<void> }>("WidgetBridge");

const KEY_STEPS = "widget_steps";
const KEY_WATER = "widget_water";
const KEY_WATER_DELTA = "widget_pending_water_delta";
const KEY_ACTION = "widget_action";

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Push the latest steps / water values to the widget (via Capacitor Preferences,
 * which the native widget reads) and ask it to refresh. No-op on web.
 */
export async function pushWidgetData(steps: number | null, waterL: number | null): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { Preferences } = await import("@capacitor/preferences");
    if (steps != null) await Preferences.set({ key: KEY_STEPS, value: String(Math.round(steps)) });
    if (waterL != null) await Preferences.set({ key: KEY_WATER, value: String(Math.round(waterL * 10) / 10) });
    try { await WidgetBridge.refresh(); } catch { /* widget not added / plugin missing */ }
  } catch { /* preferences unavailable */ }
}

/**
 * Read and clear any pending widget interactions:
 *  - waterDelta: net liters the user added/removed from the widget while the app was closed
 *  - sos: whether the SOS button was tapped on the widget
 */
export async function consumeWidgetActions(): Promise<{ waterDelta: number; sos: boolean }> {
  const out = { waterDelta: 0, sos: false };
  if (!Capacitor.isNativePlatform()) return out;
  try {
    const { Preferences } = await import("@capacitor/preferences");

    const d = await Preferences.get({ key: KEY_WATER_DELTA });
    const delta = parseFloat(d.value ?? "0");
    if (!isNaN(delta) && delta !== 0) {
      out.waterDelta = delta;
      await Preferences.set({ key: KEY_WATER_DELTA, value: "0" });
    }

    const a = await Preferences.get({ key: KEY_ACTION });
    if (a.value === "sos") {
      out.sos = true;
      await Preferences.set({ key: KEY_ACTION, value: "" });
    }
  } catch { /* preferences unavailable */ }
  return out;
}
