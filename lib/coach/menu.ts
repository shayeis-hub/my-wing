/**
 * Per-client nutrition menu uploaded by the dietitian. The AI extracts it from
 * a PDF/photo into this shape, the dietitian reviews and edits it, and only
 * then does the client see it (clientMenus/{clientId}). Drafts live in
 * clientMenuDrafts/{clientId} and are coach-only.
 */

export interface MenuMeal {
  name: string;
  /** "HH:mm" or a free range like "07:00-09:00"; optional. */
  time?: string;
  /** Set when the menu differs by day ("יום א'"). */
  day?: string;
  /** Alternatives for the same meal; the client picks one. */
  options: string[];
}

export interface MenuData {
  title?: string;
  targets: { calories?: number; proteinG?: number; carbsG?: number; fatG?: number };
  meals: MenuMeal[];
  avoid: string[];
  notes: string[];
  /** Things the AI wasn't sure it read right. Draft-only; dropped on publish. */
  unclear: string[];
}

export interface MenuSource {
  path: string;
  name: string;
  contentType: string;
  size: number;
}

export interface ClientMenuDraft {
  clientId: string;
  coachId: string;
  menu: MenuData;
  source?: MenuSource;
  updatedAt?: string;
}

export interface PublishedClientMenu {
  clientId: string;
  coachId: string;
  coachName?: string;
  menu: MenuData;
  publishedAt?: string;
}

export const MENU_FILE_MAX_BYTES = 10 * 1024 * 1024;
export const MENU_ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

const clip = (v: unknown, max: number): string =>
  (typeof v === "string" ? v : "").replace(/\s+/g, " ").trim().slice(0, max);
const num = (v: unknown): number | undefined => {
  const n = typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) && n > 0 && n <= 20000 ? Math.round(n) : undefined;
};
const list = (v: unknown, maxItems: number, maxLen: number): string[] =>
  (Array.isArray(v) ? v : []).map((x) => clip(x, maxLen)).filter(Boolean).slice(0, maxItems);

/** Coerces anything (AI output or a client form) into a safe, bounded MenuData. */
export function sanitizeMenu(raw: unknown): MenuData {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const t = (r.targets && typeof r.targets === "object" ? r.targets : {}) as Record<string, unknown>;
  const targets: MenuData["targets"] = {};
  const cal = num(t.calories), p = num(t.proteinG), c = num(t.carbsG), f = num(t.fatG);
  if (cal) targets.calories = cal;
  if (p) targets.proteinG = p;
  if (c) targets.carbsG = c;
  if (f) targets.fatG = f;

  const meals: MenuMeal[] = (Array.isArray(r.meals) ? r.meals : [])
    .slice(0, 60)
    .map((m) => {
      const mm = (m && typeof m === "object" ? m : {}) as Record<string, unknown>;
      const meal: MenuMeal = { name: clip(mm.name, 80), options: list(mm.options, 25, 500) };
      const time = clip(mm.time, 20);
      const day = clip(mm.day, 40);
      if (time) meal.time = time;
      if (day) meal.day = day;
      return meal;
    })
    .filter((m) => m.name || m.options.length > 0);

  const menu: MenuData = {
    targets,
    meals,
    avoid: list(r.avoid, 60, 300),
    notes: list(r.notes, 60, 600),
    unclear: list(r.unclear, 30, 300),
  };
  const title = clip(r.title, 120);
  if (title) menu.title = title;
  return menu;
}

/** One option / bullet per line <-> string[] for the review form. */
export const linesToList = (text: string): string[] => text.split("\n").map((l) => l.trim()).filter(Boolean);
export const listToLines = (items: string[]): string => items.join("\n");

/** Plain-text rendering, used to give the meal AI the client's menu as context. */
export function menuToPromptText(menu: MenuData): string {
  const lines: string[] = [];
  if (menu.title) lines.push(menu.title);
  const t = menu.targets;
  const targets = [
    t.calories ? `${t.calories} קק"ל` : "",
    t.proteinG ? `חלבון ${t.proteinG}ג` : "",
    t.carbsG ? `פחמימות ${t.carbsG}ג` : "",
    t.fatG ? `שומן ${t.fatG}ג` : "",
  ].filter(Boolean);
  if (targets.length) lines.push(`יעדים יומיים: ${targets.join(", ")}`);
  for (const m of menu.meals) {
    const head = [m.day, m.name, m.time && `(${m.time})`].filter(Boolean).join(" ");
    lines.push(`${head}: ${m.options.join(" | ")}`);
  }
  if (menu.avoid.length) lines.push(`להימנע/להגביל: ${menu.avoid.join("; ")}`);
  if (menu.notes.length) lines.push(`הערות: ${menu.notes.join("; ")}`);
  return lines.join("\n");
}
