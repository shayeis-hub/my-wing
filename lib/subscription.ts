export type Plan = "free" | "premium" | "grandfathered";
export type PriceType = "monthly" | "yearly";
export type CoachPlanId = "free" | "basic" | "extended" | "unlimited";

export const COACH_FREE_TRIAL_DAYS = 30;

// ── Coach (business / dietitian) plans ──────────────────────────────────────────
// maxClients is the number of CLIENTS (the coach herself is not counted).
export const COACH_PLANS: Record<CoachPlanId, { maxClients: number | null; priceILS: number; label: string; trialDays?: number }> = {
  free:      { maxClients: 1,    priceILS: 0,   label: "התנסות חינם", trialDays: COACH_FREE_TRIAL_DAYS },
  basic:     { maxClients: 10,   priceILS: 89,  label: "עד 10 לקוחות" },
  extended:  { maxClients: 30,   priceILS: 249, label: "עד 30 לקוחות" },
  unlimited: { maxClients: null, priceILS: 499, label: "ללא הגבלה" },
};

/** True if the coach can add another client given their plan's maxClients. */
export function canCoachAddClient(plan: CoachPlanId, currentClientCount: number): boolean {
  const max = COACH_PLANS[plan].maxClients;
  if (max == null) return true;
  return currentClientCount < max;
}

/** True if the coach account is active — checks the flag and (for free) expiry. */
export function isCoachActive(
  coach: { active?: boolean; expiresAt?: string | null } | null | undefined
): boolean {
  if (!coach?.active) return false;
  if (coach.expiresAt && new Date(coach.expiresAt) <= new Date()) return false;
  return true;
}

// ── Trial ─────────────────────────────────────────────────────────────────────
export const TRIAL_DAYS = 14;

/** Returns days remaining in trial (0 = expired). Pass the trial start as ms since epoch. */
export function getTrialDaysLeft(trialStartMs: number | null | undefined): number {
  if (trialStartMs == null) return TRIAL_DAYS;
  const elapsed = (Date.now() - trialStartMs) / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.ceil(TRIAL_DAYS - elapsed));
}

/**
 * Resolves the effective trial-start timestamp (ms). Prefers trialStartsAt
 * (set when a coach stops paying) and falls back to account creation.
 */
export function resolveTrialStartMs(
  trialStartsAt: string | null | undefined,
  createdAtMs: number | null | undefined
): number | null {
  if (trialStartsAt) {
    const t = new Date(trialStartsAt).getTime();
    if (!isNaN(t)) return t;
  }
  return createdAtMs ?? null;
}

export function isTrialExpired(
  email:        string | null | undefined,
  plan:         Plan   | undefined,
  createdAtMs:  number | null | undefined,
  opts?: {
    trialStartsAt?: string | null;
    courseAccess?: { expiresAt: string } | null;
    coachAccess?: { active?: boolean } | null;
  }
): boolean {
  if (isGrandfathered(email)) return false;
  if (isPremium(email, plan, undefined, opts?.courseAccess ?? null, opts?.coachAccess ?? null)) return false;
  const startMs = resolveTrialStartMs(opts?.trialStartsAt, createdAtMs);
  return getTrialDaysLeft(startMs) === 0;
}

// ── Grandfathered users — always premium, never see ads ──────────────────────
export const GRANDFATHERED_EMAILS = [
  "sivan.ati@gmail.com",
  "shayeis@gmail.com",
  "shay@wingpact.app",
  "reutnatu@gmail.com",
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
  courseAccess?: { expiresAt: string } | null,
  coachAccess?: { active?: boolean } | null
): boolean {
  if (isGrandfathered(email)) return true;
  if (courseAccess?.expiresAt && new Date(courseAccess.expiresAt) > new Date()) return true;
  // A coach's client has full access while the coach's plan is active.
  if (coachAccess?.active) return true;
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
