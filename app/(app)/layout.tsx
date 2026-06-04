"use client";

import { AuthGuard } from "@/components/layout/AuthGuard";
import { BottomNav } from "@/components/layout/BottomNav";
import { useLanguage } from "@/lib/i18n";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { dir } = useLanguage();
  return (
    <AuthGuard>
      <div className="min-h-screen bg-wing-bg" dir={dir}>
        <main className="max-w-lg mx-auto" style={{ paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))' }}>{children}</main>
        <BottomNav />
      </div>
    </AuthGuard>
  );
}
