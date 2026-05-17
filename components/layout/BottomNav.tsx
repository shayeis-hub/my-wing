"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  UtensilsCrossed,
  Footprints,
  CheckSquare,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

const navItems = [
  { href: "/dashboard", icon: Home, label: "בית" },
  { href: "/meals", icon: UtensilsCrossed, label: "ארוחות" },
  { href: "/steps", icon: Footprints, label: "צעדים" },
  { href: "/checkin", icon: CheckSquare, label: "צ'ק-אין" },
  { href: "/wing", icon: Users, label: "מבנה" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 flex justify-around items-center h-16 z-50 shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
      {navItems.map(({ href, icon: Icon, label }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors",
              active ? "text-wing-primary" : "text-slate-400"
            )}
          >
            <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
