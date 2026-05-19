import { format, subDays } from "date-fns";

/**
 * Count consecutive days with a checkin going backwards from today.
 * dates: array of "yyyy-MM-dd" strings (order doesn't matter).
 */
export function calcStreak(dates: string[]): number {
  const set = new Set(dates);
  let streak = 0;
  let cursor = new Date();
  while (true) {
    const d = format(cursor, "yyyy-MM-dd");
    if (!set.has(d)) break;
    streak++;
    cursor = subDays(cursor, 1);
  }
  return streak;
}
