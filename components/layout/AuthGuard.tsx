"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { syncWingMemberUid } from "@/lib/firebase/firestore";
import { isTrialExpired } from "@/lib/subscription";
import { getHabitByOrder } from "@/lib/book/habits";
import type { Timestamp } from "firebase/firestore";

const HABIT_1_ID = getHabitByOrder(1)!.id;

function toMs(ts: Timestamp | null | undefined): number | null {
  if (!ts) return null;
  if (typeof ts.toDate === "function") return ts.toDate().getTime();
  const s = (ts as unknown as { _seconds?: number })._seconds;
  return s ? s * 1000 : null;
}

const PAYWALL_EXEMPT = ["/subscription", "/onboarding", "/login", "/register", "/coach", "/book"];

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

    // Book-mode: redeemed the book code but hasn't started habit 1 yet →
    // its own short onboarding, instead of the regular wing/profile flow.
    const needsBookOnboarding =
      user?.bookAccess?.active && !Object.keys(user?.habitProgress ?? {}).length;
    if (needsBookOnboarding && !pathname.startsWith("/book")) {
      router.replace("/book/onboarding");
      return;
    }

    // Profile incomplete → onboarding (business/coach accounts don't track
    // personally, so they skip the personal onboarding gate). /book is also
    // exempt — the "got a code from the book?" link on /onboarding sends a
    // still-profile-incomplete user to /book/redeem, and without this they'd
    // get bounced straight back here before they could even see that page.
    const profileIncomplete = !user?.profile?.age || user.profile.age === 0;
    if (!isBusiness && !needsBookOnboarding && profileIncomplete && pathname !== "/onboarding" && !pathname.startsWith("/book")) {
      router.replace("/onboarding");
      return;
    }

    // Trial expired → paywall (unless already on an exempt page, or the user
    // already chose "Continue in view-only mode" — see the subscription
    // page's trial_view_only button, which sets this before navigating away.
    // Without this check every navigation bounced straight back here, so
    // "view-only" never actually let anyone view anything.
    const exempt = PAYWALL_EXEMPT.some((p) => pathname.startsWith(p));
    const viewOnlyAck =
      typeof window !== "undefined" && sessionStorage.getItem("wingpact_view_only_ack") === "1";
    if (!exempt && !isBusiness && !viewOnlyAck && user) {
      const email = firebaseUser.email ?? user.email ?? "";
      const createdAtMs = toMs(user.createdAt ?? null);
      if (isTrialExpired(email, user.subscription?.plan, createdAtMs, {
        trialStartsAt: user.trialStartsAt ?? null,
        courseAccess: user.courseAccess ?? null,
        coachAccess: user.coachAccess ?? null,
        bookAccess: user.bookAccess ?? null,
        habit1InstalledAt: user.habitProgress?.[HABIT_1_ID]?.installedAt ?? null,
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
