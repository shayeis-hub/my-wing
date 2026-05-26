// ── Grandfathered users — always premium, never see ads ──────────────────────
export const GRANDFATHERED_EMAILS = [
  "sivan.ati@gmail.com",
  "shayeis@gmail.com",
];

// ── Free-plan limits ──────────────────────────────────────────────────────────
export const FREE_LIMITS = {
  mealPhotosPerDay: 3,
  wingMembers: 5,
} as const;

// ── Paddle price IDs (set in Vercel env vars) ─────────────────────────────────
export const PADDLE_PRICES = {
  monthly: process.env.PADDLE_PRICE_MONTHLY ?? "",
  yearly:  process.env.PADDLE_PRICE_YEARLY  ?? "",
} as const;

export type Plan = "free" | "premium" | "grandfathered";
export type PriceType = "monthly" | "yearly";

// ── Helpers ───────────────────────────────────────────────────────────────────
export function isGrandfathered(email?: string | null): boolean {
  if (!email) return false;
  return GRANDFATHERED_EMAILS.map((e) => e.toLowerCase()).includes(
    email.toLowerCase()
  );
}

export function isPremium(email?: string | null, plan?: Plan): boolean {
  if (isGrandfathered(email)) return true;
  return plan === "premium" || plan === "grandfathered";
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
