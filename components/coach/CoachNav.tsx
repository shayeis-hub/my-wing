"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, ClipboardList, Menu } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useLanguage } from "@/lib/i18n";
import { HamburgerMenu } from "@/components/layout/HamburgerMenu";

// Bottom navigation for dietitian (business) accounts: a work tool, not the
// client app — status first, then clients and menus.
export function CoachNav() {
  const pathname = usePathname();
  const { lang } = useLanguage();
  const he = lang === "he";
  const [menuOpen, setMenuOpen] = useState(false);

  const items = [
    { href: "/coach", icon: LayoutDashboard, label: he ? "סטטוס" : "Status", match: (p: string) => p === "/coach" },
    { href: "/coach/clients", icon: Users, label: he ? "לקוחות" : "Clients", match: (p: string) => p.startsWith("/coach/clients") },
    { href: "/coach/menus", icon: ClipboardList, label: he ? "תפריטים" : "Menus", match: (p: string) => p.startsWith("/coach/menu") },
  ];

  return (
    <>
      <nav
        className="wing-bottom-nav fixed bottom-0 left-0 right-0 mx-3 bg-wing-surface border border-wing-border rounded-[22px] flex justify-around items-center h-16 z-40 shadow-[0_4px_24px_rgba(0,0,0,0.08)]"
        style={{ marginBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
      >
        {items.map(({ href, icon: Icon, label, match }) => {
          const active = match(pathname);
          return (
            <Link key={href} href={href} className={cn("flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors", active ? "text-wing-heat" : "text-wing-muted")}>
              <Icon size={21} strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-xs font-medium">{label}</span>
            </Link>
          );
        })}
        <button onClick={() => setMenuOpen(true)} className={cn("flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors", menuOpen ? "text-wing-heat" : "text-wing-muted")}>
          <Menu size={21} strokeWidth={1.8} />
          <span className="text-xs font-medium">{he ? "עוד" : "More"}</span>
        </button>
      </nav>
      <HamburgerMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
