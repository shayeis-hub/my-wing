import { useAuth } from "./useAuth";
import { isTrialExpired } from "@/lib/subscription";
import type { Timestamp } from "firebase/firestore";

function toMs(ts: Timestamp | null | undefined): number | null {
  if (!ts) return null;
  if (typeof ts.toDate === "function") return ts.toDate().getTime();
  const s = (ts as unknown as { _seconds?: number })._seconds;
  return s ? s * 1000 : null;
}

/**
 * Returns true when the user's 7-day trial has expired and they are not premium.
 * Grandfathered users always return false.
 */
export function useTrialLock(): boolean {
  const { user, firebaseUser } = useAuth();
  const email = firebaseUser?.email ?? user?.email ?? "";
  const createdAtMs = toMs(user?.createdAt ?? null);
  return isTrialExpired(email, user?.subscription?.plan, createdAtMs);
}
