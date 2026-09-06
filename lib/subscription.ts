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
export const TRIAL_DAYS = 21;

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

/**
 * All the special-access grants that can bypass the normal paywall, bundled
 * into one object instead of threaded through as separate positional
 * parameters. Any object that structurally carries these fields (the full
 * `User` doc, a Firestore `.data()` snapshot, etc.) can be passed directly —
 * that's the point: adding a new grant type (e.g. a future partner-program
 * access) means adding one field here and one check in isPremium, with zero
 * changes at call sites that already pass the whole user/doc object.
 *
 * Replaces what used to be 3 separate optional positional params on
 * isPremium/isTrialExpired/canAddMealPhoto — that shape made it easy to
 * silently forget one (found 2026-09-06: several isPremium call sites were
 * passing `undefined` for coachAccess, so a coach's client saw ads, hit the
 * meal-photo limit, and saw the wrong subscription-page state).
 */
export interface AccessGrants {
  courseAccess?: { expiresAt: string } | null;
  coachAccess?: { active?: boolean } | null;
  bookAccess?: { active?: boolean; grantedBy?: string; sponsorPaying?: boolean } | null;
  /** "Aba Chatuv" cohort — externally-paid, fixed-duration access. No IAP involved; see types/index.ts's User.fitDadAccess. */
  fitDadAccess?: { active?: boolean; expiresAt?: string } | null;
}

/** True if an ISO expiry timestamp is set and still in the future. Shared by courseAccess and fitDadAccess, which both grant access until a fixed date rather than via a recurring subscription. */
function isExpiryActive(expiresAt: string | null | undefined): boolean {
  return !!expiresAt && new Date(expiresAt) > new Date();
}

export function isTrialExpired(
  email:        string | null | undefined,
  plan:         Plan   | undefined,
  createdAtMs:  number | null | undefined,
  opts?: AccessGrants & {
    trialStartsAt?: string | null;
    /** habitProgress[habit-1-id]?.installedAt, if book mode is active. */
    habit1InstalledAt?: string | null;
  }
): boolean {
  if (isGrandfathered(email)) return false;
  if (isPremium(email, plan, undefined, opts ?? null)) return false;

  // "Aba Chatuv" accounts never fall back to the regular day-count trial —
  // once fitDadAccess exists at all, access is binary: either isPremium()
  // above returned true (plan still active) or it didn't, meaning the plan
  // has lapsed (or was manually deactivated) and the paywall applies now,
  // regardless of how recently the account itself was created. Without this,
  // a fitDad account created less than 21 days ago would incorrectly get a
  // few free days on the generic trial clock even after its real plan ended.
  if (opts?.fitDadAccess) return true;

  // Book mode isn't on a day-count clock at all — free until habit 1 is
  // marked installed (the book's own rule), then locked unless subscribed.
  if (opts?.bookAccess?.active) {
    return !!opts.habit1InstalledAt;
  }

  const startMs = resolveTrialStartMs(opts?.trialStartsAt, createdAtMs);
  return getTrialDaysLeft(startMs) === 0;
}

// ── Grandfathered users — always premium, never see ads ──────────────────────
export const GRANDFATHERED_EMAILS = [
  "sivan.ati@gmail.com",
  "shayeis@gmail.com",
  "reutnatu@gmail.com",
];

// ── Free-plan limits ──────────────────────────────────────────────────────────
export const FREE_LIMITS = {
  mealPhotosPerDay: 3,
  wingMembers: 3,
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
  grants?: AccessGrants | null
): boolean {
  if (isGrandfathered(email)) return true;
  if (isExpiryActive(grants?.courseAccess?.expiresAt)) return true;
  // A coach's client has full access while the coach's plan is active.
  if (grants?.coachAccess?.active) return true;
  // "Aba Chatuv" cohort — active while their externally-paid 3/6/12-month
  // plan hasn't expired. Once it does, isPremium() correctly returns false
  // for them (no `plan:"premium"` subscription of their own) — the
  // subscription page shows a dedicated "renew via WhatsApp" screen instead
  // of the normal IAP paywall, since they have no in-app way to pay.
  if (grants?.fitDadAccess?.active && isExpiryActive(grants?.fitDadAccess?.expiresAt)) return true;
  // A friend riding free on a book-mode subscriber's wing (grantedBy set —
  // NOT a self-redeemed book code, which stays on the habit-1-gated trial
  // logic below) gets the post-habit-1 paywall bypassed only while the
  // inviter is a genuinely paying subscriber (sponsorPaying, kept in sync
  // by the webhook) — otherwise they fall back to the same free-through-
  // habit-1 trial as anyone else, no free ride without a paying sponsor.
  if (grants?.bookAccess?.active && grants?.bookAccess?.grantedBy && grants?.bookAccess?.sponsorPaying) return true;
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
  todayCount: number,
  grants?: AccessGrants | null
): boolean {
  if (isPremium(email, plan, undefined, grants)) return true;
  return todayCount < FREE_LIMITS.mealPhotosPerDay;
}

// A book-mode wing (created silently during book onboarding) is capped at
// the owner + 2 free-riding friends — 3 total, regardless of the owner's
// subscription tier. Not the regular 20-cap for premium wings; the book
// pricing/mechanic was designed around exactly 2 free friends, no more.
export const BOOK_WING_MAX_MEMBERS = 3;

// "Aba Chatuv" wings (private or public pool) enforce this cap regardless of
// anyone's plan — the first real enforced numeric cap on a non-book/coach
// wing (canAddWingMember below never actually limits premium users today).
export const FIT_DAD_WING_MAX_MEMBERS = 20;

export function canAddWingMember(
  ownerEmail: string | null | undefined,
  ownerPlan: Plan,
  currentCount: number
): boolean {
  if (isPremium(ownerEmail, ownerPlan)) return true;
  return currentCount < FREE_LIMITS.wingMembers;
}
