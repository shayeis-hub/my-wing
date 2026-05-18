"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { syncWingMemberUid } from "@/lib/firebase/firestore";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { firebaseUser, user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const syncedRef = useRef(false);

  useEffect(() => {
    if (!firebaseUser || !user?.wingId || !user?.displayName || syncedRef.current) return;
    syncedRef.current = true;
    syncWingMemberUid(user.wingId, firebaseUser.uid, user.displayName).catch(() => {});
  }, [firebaseUser, user]);

  useEffect(() => {
    if (loading) return;

    if (!firebaseUser) {
      router.replace("/login");
      return;
    }

    // First-time user: profile not filled yet (age === 0)
    const profileIncomplete = user?.profile?.age === 0 || !user?.profile?.age;
    const onOnboarding = pathname === "/onboarding";

    if (profileIncomplete && !onOnboarding) {
      router.replace("/onboarding");
    }
  }, [firebaseUser, user, loading, router, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-wing-bg flex items-center justify-center">
        <div className="text-4xl animate-bounce">🪽</div>
      </div>
    );
  }

  if (!firebaseUser) return null;

  return <>{children}</>;
}
