export type Plan = "free" | "premium" | "grandfathered";
export type PriceType = "monthly" | "yearly";

// ── Trial ─────────────────────────────────────────────────────────────────────
export const TRIAL_DAYS = 14;

/** Returns days remaining in trial (0 = expired). Pass createdAt as ms since epoch. */
export function getTrialDaysLeft(createdAtMs: number | null | undefined): number {
  if (createdAtMs == null) return TRIAL_DAYS;
  const elapsed = (Date.now() - createdAtMs) / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.ceil(TRIAL_DAYS - elapsed));
}

export function isTrialExpired(
  email:        string | null | undefined,
  plan:         Plan   | undefined,
  createdAtMs:  number | null | undefined
): boolean {
  if (isGrandfathered(email)) return false;
  if (isPremium(email, plan)) return false;
  return getTrialDaysLeft(createdAtMs) === 0;
}

// ── Grandfathered users — always premium, never see ads ──────────────────────
export const GRANDFATHERED_EMAILS = [
  "sivan.ati@gmail.com",
  "shayeis@gmail.com",
];

// ── Free-plan limits ──────────────────────────────────────────────────────────
export const FREE_LIMITS = {
  mealPhotosPerDay: 3,
  wingMembers: 3,
} as const;

// ── PayPal billing plan IDs (set in Vercel env vars after running paypal-setup) ──
export const PAYPAL_PLANS = {
  monthly_ILS: process.env.PAYPAL_PLAN_ILS_MONTHLY ?? "",
  yearly_ILS:  process.env.PAYPAL_PLAN_ILS_YEARLY  ?? "",
  monthly_USD: process.env.PAYPAL_PLAN_USD_MONTHLY ?? "",
  yearly_USD:  process.env.PAYPAL_PLAN_USD_YEARLY  ?? "",
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────────
export function isGrandfathered(email?: string | null): boolean {
  if (!email) return false;
  return GRANDFATHERED_EMAILS.map((e) => e.toLowerCase()).includes(
    email.toLowerCase()
  );
}

export function isPremium(
  email?: string | null,
  plan?: Plan,
  subscription?: {
    cancelPending?: boolean;
    expiresAt?: string | { toDate?: () => Date; _seconds?: number } | null;
  } | null,
  courseAccess?: { expiresAt: string } | null
): boolean {
  if (isGrandfathered(email)) return true;
  if (courseAccess?.expiresAt && new Date(courseAccess.expiresAt) > new Date()) return true;
  if (plan !== "premium" && plan !== "grandfathered") return false;
  // If cancellation is pending, check whether the paid period has already ended
  if (subscription?.cancelPending && subscription.expiresAt) {
    let expiresDate: Date;
    const exp = subscription.expiresAt;
    if (typeof exp === "string") {
      expiresDate = new Date(exp);
    } else if (typeof exp === "object" && exp !== null && typeof (exp as { toDate?: () => Date }).toDate === "function") {
      expiresDate = (exp as { toDate: () => Date }).toDate();
    } else if (typeof exp === "object" && exp !== null && typeof (exp as { _seconds?: number })._seconds === "number") {
      expiresDate = new Date((exp as { _seconds: number })._seconds * 1000);
    } else {
      return true; // unknown format — assume still active
    }
    return expiresDate > new Date();
  }
  return true;
}

export function canAddMealPhoto(
  email: string | null | undefined,
  plan: Plan,
  todayCount: number
): boolean {
  if (isPremium(email, plan)) return true;
  return todayCount < FREE_LIMITS.mealPhotosPerDay;
}

export function canAddWingMember(
  ownerEmail: string | null | undefined,
  ownerPlan: Plan,
  currentCount: number
): boolean {
  if (isPremium(ownerEmail, ownerPlan)) return true;
  return currentCount < FREE_LIMITS.wingMembers;
}
