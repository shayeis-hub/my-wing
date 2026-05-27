"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  UtensilsCrossed,
  Activity,
  CheckSquare,
  Trophy,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useLanguage } from "@/lib/i18n";
import { HamburgerMenu } from "./HamburgerMenu";

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { href: "/dashboard", icon: Home, label: t("nav_home") },
    { href: "/meals", icon: UtensilsCrossed, label: t("nav_meals") },
    { href: "/feed", icon: Activity, label: t("nav_feed") },
    { href: "/checkin", icon: CheckSquare, label: t("nav_checkin") },
    { href: "/challenges", icon: Trophy, label: t("nav_challenges") },
  ];

  return (
    <>
      <nav className="wing-bottom-nav fixed bottom-0 left-0 right-0 mx-3 bg-wing-surface border border-wing-border rounded-[22px] flex justify-around items-center h-16 z-40 shadow-[0_4px_24px_rgba(0,0,0,0.08)] transition-transform duration-300 ease-out" style={{ marginBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-colors",
                active ? "text-wing-heat" : "text-wing-muted"
              )}
            >
              <Icon size={21} strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-xs font-medium">{label}</span>
            </Link>
          );
        })}

        {/* Hamburger */}
        <button
          onClick={() => setMenuOpen(true)}
          className={cn(
            "flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-colors",
            menuOpen ? "text-wing-heat" : "text-wing-muted"
          )}
        >
          <Menu size={21} strokeWidth={1.8} />
          <span className="text-xs font-medium">{t("nav_menu")}</span>
        </button>
      </nav>

      <HamburgerMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
