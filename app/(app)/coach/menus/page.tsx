"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils/cn";
import { CoachGate } from "@/components/coach/CoachGate";
import { useCoachAccount } from "@/hooks/useCoachAccount";
import type { MenuOverviewRow } from "@/lib/coach/menu";

function menuState(r: MenuOverviewRow): "none" | "draft" | "live" | "live_changes" {
  if (!r.published && !r.hasDraft) return "none";
  if (!r.published) return "draft";
  return r.hasDraft && (r.draftUpdatedAt ?? "") > (r.publishedAt ?? "") ? "live_changes" : "live";
}

function MenusOverview() {
  const { firebaseUser, lang } = useCoachAccount();
  const he = lang === "he";
  const router = useRouter();
  const [rows, setRows] = useState<MenuOverviewRow[] | null>(null);
  const [error, setError] = useState(false);
  const Chevron = he ? ChevronLeft : ChevronRight;

  useEffect(() => {
    if (!firebaseUser) return;
    (async () => {
      try {
        const token = await firebaseUser.getIdToken();
        const res = await fetch("/api/coach/menus", { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error();
        setRows((await res.json()).rows);
      } catch {
        setError(true);
      }
    })();
  }, [firebaseUser]);

  const labels = {
    none: { t: he ? "אין תפריט" : "No menu", c: "bg-red-50 text-red-600 border-red-200" },
    draft: { t: he ? "טיוטה - לא פורסם" : "Draft - not published", c: "bg-amber-50 text-amber-700 border-amber-200" },
    live_changes: { t: he ? "יש שינויים שלא פורסמו" : "Unpublished changes", c: "bg-amber-50 text-amber-700 border-amber-200" },
    live: { t: he ? "פורסם" : "Published", c: "bg-green-50 text-green-700 border-green-200" },
  } as const;

  return (
    <div className="p-4 space-y-3" dir={he ? "rtl" : "ltr"}>
      <div className="pt-4">
        <h1 className="text-xl font-bold text-wing-ink">{he ? "תפריטים" : "Menus"}</h1>
        <p className="text-sm text-wing-muted mt-1">{he ? "תפריט אישי לכל לקוח - העלאה, עריכה ופרסום" : "A personal menu for every client - upload, edit and publish"}</p>
      </div>

      {error && <p className="text-sm text-wing-muted text-center py-8">{he ? "לא הצלחנו לטעון" : "Couldn't load"}</p>}
      {!error && rows === null && [0, 1, 2].map((i) => <div key={i} className="h-16 bg-wing-elevated border border-wing-border rounded-2xl animate-pulse" />)}
      {rows && rows.length === 0 && <p className="text-sm text-wing-muted text-center py-8">{he ? "אין עדיין לקוחות" : "No clients yet"}</p>}

      {rows?.map((r) => {
        const st = menuState(r);
        const date = r.publishedAt ? new Date(r.publishedAt).toLocaleDateString(he ? "he-IL" : "en-GB") : null;
        return (
          <button key={r.uid} onClick={() => router.push(`/coach/menu/${r.uid}`)} className="w-full flex items-center gap-3 bg-wing-surface border border-wing-border rounded-2xl px-3.5 py-3 text-start active:scale-[0.99] transition-transform">
            <Avatar name={r.displayName} photoURL={r.photoURL} size={38} />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-wing-ink text-sm truncate">{r.displayName}</p>
              {date && st !== "none" && st !== "draft" && <p className="text-[11px] text-wing-muted">{he ? `פורסם ב-${date}` : `Published ${date}`}</p>}
            </div>
            <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full border shrink-0", labels[st].c)}>{labels[st].t}</span>
            <Chevron size={16} className="text-wing-muted shrink-0" />
          </button>
        );
      })}
    </div>
  );
}

export default function CoachMenusPage() {
  return (
    <CoachGate>
      <MenusOverview />
    </CoachGate>
  );
}
