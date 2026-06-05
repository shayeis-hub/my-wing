import { Capacitor } from "@capacitor/core";

/** True when running inside the native Capacitor shell (Android/iOS app). */
export function isNativeApp(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export type HealthStepsResult = {
  /** Health Connect (Android) / HealthKit (iOS) is installed & supported. */
  available: boolean;
  /** User granted read access to steps. */
  authorized: boolean;
  /** Today's total steps, or null if unavailable/unauthorized. */
  steps: number | null;
  reason?: "not-native" | "unavailable" | "denied" | "error";
};

/**
 * Reads today's total step count from the device health store
 * (Health Connect on Android, HealthKit on iOS). Prompts for
 * authorization if not yet granted. Web/PWA returns not-native.
 */
export async function readTodayStepsFromHealth(): Promise<HealthStepsResult> {
  if (!isNativeApp()) {
    return { available: false, authorized: false, steps: null, reason: "not-native" };
  }
  try {
    const { Health } = await import("@capgo/capacitor-health");

    const avail = await Health.isAvailable();
    if (!avail.available) {
      return { available: false, authorized: false, steps: null, reason: "unavailable" };
    }

    const status = await Health.requestAuthorization({ read: ["steps"] });
    if (!status.readAuthorized.includes("steps")) {
      return { available: true, authorized: false, steps: null, reason: "denied" };
    }

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const res = await Health.queryAggregated({
      dataType: "steps",
      startDate: start.toISOString(),
      endDate: now.toISOString(),
      bucket: "day",
      aggregation: "sum",
    });
    const steps = res.samples.reduce((sum, s) => sum + (s.value || 0), 0);
    return { available: true, authorized: true, steps: Math.round(steps) };
  } catch {
    return { available: false, authorized: false, steps: null, reason: "error" };
  }
}

/** Opens the Health Connect settings/install screen (Android only). */
export async function openHealthSettings(): Promise<void> {
  if (!isNativeApp()) return;
  try {
    const { Health } = await import("@capgo/capacitor-health");
    await Health.openHealthConnectSettings();
  } catch {
    /* no-op */
  }
}
