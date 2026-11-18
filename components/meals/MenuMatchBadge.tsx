import { cn } from "@/lib/utils/cn";
import type { MenuMatch } from "@/types";

const STYLE: Record<MenuMatch["status"], string> = {
  match: "bg-green-50 border-green-200 text-green-800",
  partial: "bg-amber-50 border-amber-200 text-amber-800",
  off: "bg-red-50 border-red-200 text-red-700",
  unknown: "bg-wing-elevated border-wing-border text-wing-muted",
};

/** How a meal fits the client's dietitian menu: score, which menu meal, and a one-line note. */
export function MenuMatchBadge({ match, lang, compact = false }: { match: MenuMatch; lang: "he" | "en"; compact?: boolean }) {
  const he = lang === "he";
  const label = {
    match: he ? "תואם לתפריט" : "Fits your menu",
    partial: he ? "תואם חלקית" : "Partly fits",
    off: he ? "חורג מהתפריט" : "Off menu",
    unknown: he ? "לא ברור מול התפריט" : "Unclear vs menu",
  }[match.status];

  if (compact) {
    return (
      <span className={cn("inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border tabular", STYLE[match.status])}>
        {match.status === "unknown" ? label : `${match.score}`}
      </span>
    );
  }

  return (
    <div className={cn("rounded-2xl border px-3 py-2.5 space-y-0.5", STYLE[match.status])}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold">{label}{match.slot ? ` · ${match.slot}` : ""}</p>
        {match.status !== "unknown" && <p className="text-sm font-black tabular" dir="ltr">{match.score}/100</p>}
      </div>
      {match.note && <p className="text-xs leading-relaxed opacity-90">{match.note}</p>}
    </div>
  );
}
