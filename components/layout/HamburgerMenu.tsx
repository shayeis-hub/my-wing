"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/lib/i18n";
import { signOut } from "@/lib/firebase/auth";
import { Avatar } from "@/components/ui/Avatar";
import {
  X,
  UserCircle,
  Users,
  Mail,
  ShieldCheck,
  FileText,
  LogOut,
  BookOpen,
  CalendarDays,
  TrendingDown,
  Settings,
} from "lucide-react";

interface HamburgerMenuProps {
  open: boolean;
  onClose: () => void;
}

export function HamburgerMenu({ open, onClose }: HamburgerMenuProps) {
  const { user } = useAuth();
  const { t, lang, dir } = useLanguage();
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  async function handleSignOut() {
    onClose();
    await signOut();
    router.replace("/login");
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end" dir={dir}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div
        ref={panelRef}
        className="relative w-full max-w-lg mx-auto bg-wing-surface rounded-t-[28px] shadow-2xl pb-8 pt-2"
      >
        {/* Handle */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 bg-wing-border rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-wing-border">
          <span className="font-bold text-wing-ink text-base">{t("menu_title")}</span>
          <button onClick={onClose} className="p-1.5 hover:bg-wing-elevated rounded-xl transition-colors">
            <X size={20} className="text-wing-muted" />
          </button>
        </div>

        {/* User info */}
        {user && (
          <div className="flex items-center gap-3 px-5 py-4 border-b border-wing-border">
            <Avatar
              name={user.displayName ?? ""}
              photoURL={user.photoURL}
              size={48}
              className="border-2 border-white shadow-sm"
            />
            <div>
              <p className="font-bold text-wing-ink text-base leading-tight">{user.displayName}</p>
              <p className="text-xs text-wing-muted mt-0.5">{user.email}</p>
            </div>
          </div>
        )}

        {/* Menu items */}
        <div className="px-3 py-3 space-y-1">
          {/* Profile */}
          <Link href="/profile" onClick={onClose}>
            <MenuItem icon={<UserCircle size={20} />} label={t("menu_profile")} />
          </Link>

          {/* Wing */}
          <Link href="/wing" onClick={onClose}>
            <MenuItem icon={<Users size={20} />} label={t("menu_wing")} />
          </Link>

          {/* Calendar */}
          <Link href="/calendar" onClick={onClose}>
            <MenuItem icon={<CalendarDays size={20} />} label={t("nav_calendar")} />
          </Link>

          {/* Weight progress */}
          <Link href="/weight" onClick={onClose}>
            <MenuItem
              icon={<TrendingDown size={20} />}
              label={lang === "he" ? "גרף ירידה במשקל" : "Weight Progress"}
            />
          </Link>

          {/* Settings — language, subscription and notifications live here */}
          <Link href="/settings" onClick={onClose}>
            <MenuItem icon={<Settings size={20} />} label={lang === "he" ? "הגדרות" : "Settings"} />
          </Link>

          {/* User Guide */}
          <a href={`/guides/${lang}.html`} target="_blank" rel="noopener noreferrer" onClick={onClose}>
            <MenuItem icon={<BookOpen size={20} />} label={t("menu_guide")} />
          </a>

          {/* Divider */}
          <div className="h-px bg-wing-border mx-2 my-1" />

          {/* Contact */}
          <Link href="/contact" onClick={onClose}>
            <MenuItem icon={<Mail size={20} />} label={t("menu_contact")} />
          </Link>

          {/* Privacy */}
          <Link href="/privacy" onClick={onClose}>
            <MenuItem icon={<ShieldCheck size={20} />} label={t("menu_privacy")} />
          </Link>

          {/* Terms */}
          <Link href="/terms" onClick={onClose}>
            <MenuItem icon={<FileText size={20} />} label={t("menu_terms")} />
          </Link>

          {/* Divider */}
          <div className="h-px bg-wing-border mx-2 my-1" />

          {/* Sign out */}
          <button onClick={handleSignOut} className="w-full">
            <MenuItem
              icon={<LogOut size={20} />}
              label={t("menu_signout")}
              className="text-red-500 hover:bg-red-50"
              iconClass="text-red-400"
            />
          </button>
        </div>
      </div>
    </div>
  );
}

function MenuItem({
  icon,
  label,
  className = "",
  iconClass = "text-wing-muted",
}: {
  icon: React.ReactNode;
  label: string;
  className?: string;
  iconClass?: string;
}) {
  return (
    <div
      className={`flex items-center gap-3 px-3 py-3 rounded-[14px] hover:bg-wing-elevated transition-colors ${className}`}
    >
      <span className={iconClass}>{icon}</span>
      <span className="text-sm font-medium text-wing-ink">{label}</span>
    </div>
  );
}
