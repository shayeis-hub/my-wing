/**
 * One-time setup: creates the 4 PayPal billing plans and returns their IDs.
 * Run once after deploy: GET /api/subscriptions/paypal-setup?secret=<CRON_SECRET>
 * Then add the returned plan IDs as Vercel env vars:
 *   PAYPAL_PLAN_ILS_MONTHLY
 *   PAYPAL_PLAN_ILS_YEARLY
 *   PAYPAL_PLAN_USD_MONTHLY
 *   PAYPAL_PLAN_USD_YEARLY
 */
import { NextRequest, NextResponse } from "next/server";
import { createBillingPlan } from "@/lib/paypal";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const TRIAL_DAYS = 14;

  const [ilsMonthly, ilsYearly, usdMonthly, usdYearly] = await Promise.all([
    createBillingPlan({
      name: "Wingpact Premium — חודשי",
      description: "מנוי חודשי ל-Wingpact Premium",
      currency: "ILS",
      amount: "9.90",
      interval: "MONTH",
      trialDays: TRIAL_DAYS,
    }),
    createBillingPlan({
      name: "Wingpact Premium — שנתי",
      description: "מנוי שנתי ל-Wingpact Premium (חסכון 17%)",
      currency: "ILS",
      amount: "99.00",
      interval: "YEAR",
      trialDays: TRIAL_DAYS,
    }),
    createBillingPlan({
      name: "Wingpact Premium — Monthly",
      description: "Monthly subscription to Wingpact Premium",
      currency: "USD",
      amount: "3.90",
      interval: "MONTH",
      trialDays: TRIAL_DAYS,
    }),
    createBillingPlan({
      name: "Wingpact Premium — Yearly",
      description: "Yearly subscription to Wingpact Premium (save 17%)",
      currency: "USD",
      amount: "39.00",
      interval: "YEAR",
      trialDays: TRIAL_DAYS,
    }),
  ]);

  return NextResponse.json({
    message: "Plans created — add these as Vercel env vars:",
    PAYPAL_PLAN_ILS_MONTHLY: ilsMonthly,
    PAYPAL_PLAN_ILS_YEARLY:  ilsYearly,
    PAYPAL_PLAN_USD_MONTHLY: usdMonthly,
    PAYPAL_PLAN_USD_YEARLY:  usdYearly,
  });
}
