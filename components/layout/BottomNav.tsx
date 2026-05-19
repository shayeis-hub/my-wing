"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  UtensilsCrossed,
  CalendarDays,
  CheckSquare,
  Trophy,
  UserCircle,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

const navItems = [
  { href: "/dashboard", icon: Home, label: "בית" },
  { href: "/meals", icon: UtensilsCrossed, label: "ארוחות" },
  { href: "/calendar", icon: CalendarDays, label: "לוח" },
  { href: "/checkin", icon: CheckSquare, label: "צ'ק-אין" },
  { href: "/challenges", icon: Trophy, label: "מבנה" },
  { href: "/profile", icon: UserCircle, label: "פרופיל" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 mx-3 mb-3 bg-wing-surface border border-wing-border rounded-[22px] flex justify-around items-center h-16 z-50 shadow-[0_4px_24px_rgba(0,0,0,0.08)]">
      {navItems.map(({ href, icon: Icon, label }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-colors",
              active ? "text-wing-heat" : "text-wing-subtle"
            )}
          >
            <Icon size={21} strokeWidth={active ? 2.5 : 1.8} />
            <span className="text-xs font-medium">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
