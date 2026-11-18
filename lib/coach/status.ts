/**
 * Client status for the dietitian dashboard. Pure functions only — the API
 * route (app/api/coach/status) gathers the raw check-ins/meals and this turns
 * them into one comparable row per client, flagged by what needs attention.
 */

export type StatusFlag = "no_data" | "silent" | "low_logging" | "weight_up" | "menu_off" | "new";

export interface ClientStatus {
  uid: string;
  displayName: string;
  photoURL?: string;
  /** Known gender of the client (null = never told us), for Hebrew wording on the dietitian's screens. */
  gender?: "male" | "female" | null;
  wingId: string;
  wingName: string;
  isPrivate: boolean;
  /** Feed posts by this client that the dietitian hasn't opened the chat since (last 14 days). */
  unreadPosts: number;
  /** "yyyy-MM-dd" of the latest check-in / meal inside the lookback window. */
  lastCheckinDate: string | null;
  lastMealDate: string | null;
  daysSinceCheckin: number | null;
  daysSinceMeal: number | null;
  /** Fewest days since ANY activity (check-in or meal); null = none in window. */
  daysSinceActivity: number | null;
  streak: number;
  /** Oldest → newest, 7 entries ending today: was there a check-in or a meal. */
  last7: boolean[];
  activeDaysLast7: number;
  todayCalories: number;
  calorieTarget: number | null;
  weightKg: number | null;
  /** Latest minus earliest weigh-in inside the window (null with < 2 weigh-ins). */
  weightChangeKg: number | null;
  weightSpanDays: number | null;
  targetWeightKg: number | null;
  /** Average menu-match score over the last 7 days (null = no scored meals). */
  menuAvgScore: number | null;
  menuMeals7: number;
  /** Meals in the last 7 days that were partly or fully off the menu. */
  menuOff7: number;
  flags: StatusFlag[];
  /** Higher = needs attention sooner. Used only for sorting. */
  attention: number;
}

export const LOOKBACK_DAYS = 21;
/** A client that signed up this recently isn't "silent", just new. */
const NEW_CLIENT_DAYS = 3;

export interface StatusInput {
  /** "yyyy-MM-dd" in Israel time. */
  today: string;
  /** Check-ins in the window: date + the metrics we read from them. */
  checkins: { date: string; weightKg?: number }[];
  /** Meals in the window: the Israel-time date and calories of each. */
  meals: { date: string; calories: number; menuStatus?: string; menuScore?: number }[];
  calorieTarget?: number | null;
  targetWeightKg?: number | null;
  /** Account creation as "yyyy-MM-dd" (Israel time), if known. */
  createdDate?: string | null;
}

export function shiftDate(date: string, deltaDays: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  return Math.round((new Date(`${to}T12:00:00Z`).getTime() - new Date(`${from}T12:00:00Z`).getTime()) / 86_400_000);
}

export function computeStatus(
  input: StatusInput
): Omit<ClientStatus, "uid" | "displayName" | "photoURL" | "wingId" | "wingName" | "isPrivate" | "unreadPosts"> {
  const { today } = input;
  const checkinDates = new Set(input.checkins.map((c) => c.date));
  const mealDates = new Set(input.meals.map((m) => m.date));

  const latest = (dates: Set<string>) => [...dates].sort().pop() ?? null;
  const lastCheckinDate = latest(checkinDates);
  const lastMealDate = latest(mealDates);
  const since = (d: string | null) => (d ? Math.max(0, daysBetween(d, today)) : null);
  const daysSinceCheckin = since(lastCheckinDate);
  const daysSinceMeal = since(lastMealDate);
  const daysSinceActivity =
    daysSinceCheckin == null ? daysSinceMeal : daysSinceMeal == null ? daysSinceCheckin : Math.min(daysSinceCheckin, daysSinceMeal);

  // Streak of days with a check-in, allowing today to still be pending.
  let streak = 0;
  let cursor = checkinDates.has(today) ? today : shiftDate(today, -1);
  while (checkinDates.has(cursor)) {
    streak++;
    cursor = shiftDate(cursor, -1);
  }

  const last7: boolean[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = shiftDate(today, -i);
    last7.push(checkinDates.has(d) || mealDates.has(d));
  }
  const activeDaysLast7 = last7.filter(Boolean).length;

  const todayCalories = Math.round(input.meals.filter((m) => m.date === today).reduce((s, m) => s + (m.calories || 0), 0));

  const weights = input.checkins
    .filter((c) => typeof c.weightKg === "number" && c.weightKg > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  const weightKg = weights.length ? weights[weights.length - 1].weightKg! : null;
  const weightChangeKg =
    weights.length >= 2 ? Math.round((weights[weights.length - 1].weightKg! - weights[0].weightKg!) * 10) / 10 : null;
  const weightSpanDays = weights.length >= 2 ? daysBetween(weights[0].date, weights[weights.length - 1].date) : null;

  const since7 = shiftDate(today, -6);
  const scored = input.meals.filter((m) => m.date >= since7 && typeof m.menuScore === "number" && m.menuStatus && m.menuStatus !== "unknown");
  const menuMeals7 = scored.length;
  const menuOff7 = scored.filter((m) => m.menuStatus === "off" || m.menuStatus === "partial").length;
  const menuAvgScore = menuMeals7 ? Math.round(scored.reduce((s, m) => s + (m.menuScore ?? 0), 0) / menuMeals7) : null;

  const flags: StatusFlag[] = [];
  const isNew = !!input.createdDate && daysBetween(input.createdDate, today) < NEW_CLIENT_DAYS;
  if (daysSinceActivity == null) {
    flags.push(isNew ? "new" : "no_data");
  } else if (daysSinceActivity >= 2) {
    flags.push("silent");
  } else if (activeDaysLast7 < 3) {
    flags.push("low_logging");
  }
  // Two rises in a row across the last three weigh-ins, at least 0.5 kg overall.
  if (weights.length >= 3) {
    const [a, b, c] = weights.slice(-3).map((w) => w.weightKg!);
    if (a < b && b < c && c - a >= 0.5) flags.push("weight_up");
  }

  if (menuOff7 >= 3) flags.push("menu_off");

  let attention = 0;
  if (flags.includes("no_data")) attention += 40;
  if (flags.includes("silent")) attention += 50 + Math.min(daysSinceActivity ?? 0, 20);
  if (flags.includes("weight_up")) attention += 30;
  if (flags.includes("low_logging")) attention += 20;
  if (flags.includes("menu_off")) attention += 25;

  return {
    lastCheckinDate,
    lastMealDate,
    daysSinceCheckin,
    daysSinceMeal,
    daysSinceActivity,
    streak,
    last7,
    activeDaysLast7,
    todayCalories,
    calorieTarget: input.calorieTarget ?? null,
    weightKg,
    weightChangeKg,
    weightSpanDays,
    targetWeightKg: input.targetWeightKg ?? null,
    menuAvgScore,
    menuMeals7,
    menuOff7,
    flags,
    attention,
  };
}
