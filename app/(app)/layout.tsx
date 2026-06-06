"use client";

import { useEffect } from "react";
import { AuthGuard } from "@/components/layout/AuthGuard";
import { BottomNav } from "@/components/layout/BottomNav";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";

// Keeps the i18n gender in sync with the signed-in user's profile so all
// Hebrew strings render in the correct masculine/feminine form.
function GenderSync() {
  const { user } = useAuth();
  const { setGender } = useLanguage();
  useEffect(() => {
    const gd = user?.profile?.gender;
    if (gd === "female" || gd === "male") setGender(gd);
  }, [user?.profile?.gender, setGender]);
  return null;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { dir } = useLanguage();
  return (
    <AuthGuard>
      <GenderSync />
      <div className="min-h-screen bg-wing-bg" dir={dir}>
        <main className="max-w-lg mx-auto" style={{ paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))' }}>{children}</main>
        <BottomNav />
      </div>
    </AuthGuard>
  );
}
