"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { syncWingMemberUid } from "@/lib/firebase/firestore";
import { isTrialExpired } from "@/lib/subscription";
import type { Timestamp } from "firebase/firestore";

function toMs(ts: Timestamp | null | undefined): number | null {
  if (!ts) return null;
  if (typeof ts.toDate === "function") return ts.toDate().getTime();
  const s = (ts as unknown as { _seconds?: number })._seconds;
  return s ? s * 1000 : null;
}

const PAYWALL_EXEMPT = ["/subscription", "/onboarding", "/login", "/register", "/coach"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { firebaseUser, user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const syncedRef = useRef(false);

  // Sync wing member uid once
  useEffect(() => {
    if (!firebaseUser || !user?.wingId || !user?.displayName || syncedRef.current) return;
    syncedRef.current = true;
    syncWingMemberUid(user.wingId, firebaseUser.uid, user.displayName).catch(() => {});
  }, [firebaseUser, user]);

  useEffect(() => {
    if (loading) return;

    // Not logged in → login
    if (!firebaseUser) {
      router.replace("/login");
      return;
    }

    const isBusiness = user?.accountType === "business";

    // Profile incomplete → onboarding (business/coach accounts don't track
    // personally, so they skip the personal onboarding gate).
    const profileIncomplete = !user?.profile?.age || user.profile.age === 0;
    if (!isBusiness && profileIncomplete && pathname !== "/onboarding") {
      router.replace("/onboarding");
      return;
    }

    // Trial expired → paywall (unless already on an exempt page).
    // Business accounts are governed by their coach plan, not the personal paywall.
    const exempt = PAYWALL_EXEMPT.some((p) => pathname.startsWith(p));
    if (!exempt && !isBusiness && user) {
      const email = firebaseUser.email ?? user.email ?? "";
      const createdAtMs = toMs(user.createdAt ?? null);
      if (isTrialExpired(email, user.subscription?.plan, createdAtMs, {
        trialStartsAt: user.trialStartsAt ?? null,
        courseAccess: user.courseAccess ?? null,
        coachAccess: user.coachAccess ?? null,
      })) {
        router.replace("/subscription?expired=1");
      }
    }
  }, [firebaseUser, user, loading, router, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-wing-bg flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-wing-border border-t-wing-primary animate-spin" />
      </div>
    );
  }

  if (!firebaseUser) return null;

  return <>{children}</>;
}
