import { AuthGuard } from "@/components/layout/AuthGuard";
import { BottomNav } from "@/components/layout/BottomNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-wing-bg">
        <main className="pb-20 max-w-lg mx-auto">{children}</main>
        <BottomNav />
      </div>
    </AuthGuard>
  );
}
